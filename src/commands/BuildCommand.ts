import { program } from "commander";
import fs from "fs"
import path from "path"
import { FastApiProject } from "../interface/FastApiProject";
import { ShellProcess } from "cmd-execute"
import { FastApiRoutePath } from "../interface/FastApiRoutePath";
import { FastApiRouteType } from "../interface/FastApiRouteType";
import { FastApiRoute } from "../interface/FastApiRoute";
import { FastApiBuildMode } from "../interface/FastApiBuildMode";

const FastApiRouteParameter = "__fastapi_routes";

export function RegisterBuildCommand() {
    program.command("build")
        .option("-p, --project [path]", "Path to project file")
        .option("-o, --output [path]", "Output directory")
        .option("-d, --debug", "Debug mode")
        .option("-os, --os [os]", "OS to build for")
        .description("Build the project")
        .action(async (args: {
            output?: string,
            project?: string,
            debug?: boolean,
            os?: string
        }) => {
            if (!args) args = {};
            if (args?.project) {
                process.chdir(path.resolve(args.project));
                console.log("Changed directory to " + process.cwd());
            }
            if (!args?.output) {
                args.output = process.cwd();
            }
            const isDebugMode = Boolean(args?.debug || false);
            var outputDir = path.resolve(args.output);
            var sourceDir = process.cwd();
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            var project = FastApiProject.open(fs.readFileSync(path.join(outputDir, "fastapi.json"), 'utf-8'));


            // Remove dist folder
            if (fs.existsSync(path.join(outputDir, "dist"))) {
                fs.rmdirSync(path.join(outputDir, "dist"), { recursive: true });
                console.log('Dist folder removed');
            }
            // Remove bundle folder
            if (fs.existsSync(path.join(outputDir, "bundle"))) {
                fs.rmdirSync(path.join(outputDir, "bundle"), { recursive: true });
                console.log('Bundle folder removed');
            }

            // Build typescript
            await new ShellProcess({
                path: "npx",
                args: ["tsc", "--build", "tsconfig.json"],
                cwd: process.cwd()
            }).run(console.log, console.error);
            console.log('Typescript build complete');

            if (isDebugMode) {
                console.log('Debug mode enabled, skipping bundling');
                return;
            }

            // collect router paths to variable
            var routes: FastApiRoutePath[] = [];
            var socketRoutes: FastApiRoutePath[] = [];

            if (Array.isArray(project.routers)) {
                for (var router of project.routers) {
                    if (router.type == FastApiRouteType.REST) {
                        retrieveRouteDefinitions(outputDir, router, routes);
                    } else if (router.type == FastApiRouteType.WEBSOCKET) {
                        retrieveRouteDefinitions(outputDir, router, socketRoutes);
                    }
                }
            }
            var hasRestRoute = routes.length > 0;
            var hasSocketRoute = socketRoutes.length > 0;

            // Recompile routes
            var compiledRoutes = recompileRoutes(FastApiRouteType.REST, routes);
            var compiledSocketRoutes = recompileRoutes(FastApiRouteType.WEBSOCKET, socketRoutes);

            // Write routes to file
            var restRouteJSPath = `fastapi_${FastApiRouteType.REST}_routes.js`;
            var socketRouteJSPath = `fastapi_${FastApiRouteType.WEBSOCKET}_routes.js`;
            if (hasRestRoute) fs.writeFileSync(path.join(outputDir, "dist", restRouteJSPath), compiledRoutes);
            if (hasSocketRoute) fs.writeFileSync(path.join(outputDir, "dist", socketRouteJSPath), compiledSocketRoutes);

            // Clean old routes
            for (var router of project.routers) {
                var routerPath = path.join(outputDir, "dist", router.path);
                if (fs.existsSync(routerPath)) {
                    fs.rmdirSync(routerPath, { recursive: true });
                }
            }

            var indexJs = fs.readFileSync(path.join(outputDir, "dist", "index.js"), 'utf-8');
            // import routes
            var imports = "";
            if (hasRestRoute) imports += "require('./" + restRouteJSPath + "');";
            if (hasSocketRoute) imports += "require('./" + socketRouteJSPath + "');";
            var globals = [];
            globals.push("process.env.DISABLE_SCAN_ROUTERS = true");
            indexJs = indexJs.replace(/"use strict";/, '"use strict";' + imports + globals.join("\n"));

            // rewrite index.js
            fs.writeFileSync(path.join(outputDir, "dist", "index.js"), indexJs);

            var distPath = path.join(outputDir, "dist");
            var distIndex = path.join(distPath, "index.js");

            if (project.build?.compress) {
                // minify js
                await new ShellProcess({
                    path: "npx",
                    args: ["terser", "--compress", "--mangle", "--output", path.join(distPath, "index.min.js"), path.join(distPath, "index.js")],
                    cwd: process.cwd()
                }).run(console.log, console.error);
            }

            if (project.build?.bundle) {
                var osList = {
                    'lin': 'node16-alpine-x64',
                    'linux': "node16-alpine-x64",
                    'win': "node16-win-x64",
                    'windows': "node16-win-x64",
                    'mac': "node16-macos-x64",
                    'macos': "node16-macos-x64",
                }
                // bundle js with node modules into one file
                await new ShellProcess({
                    path: "npx",
                    args: ["pkg", "-t", osList[args.os || "linux"], project.build?.compress ? "dist/index.min.js" : "dist/index.js", "--output", "bundle/index"],
                    cwd: process.cwd()
                }).run(console.log, console.error);
                distPath = path.join(outputDir, "bundle");
                distIndex = path.join(distPath, "index");
            }
            else {
                distIndex = path.join(distPath, "index.js");
                // remove current index.js
                if (fs.existsSync(path.join(distPath, "index.js"))) {
                    fs.unlinkSync(path.join(distPath, "index.js"));
                }
                // rename index.min.js to index.js
                fs.renameSync(path.join(outputDir, "dist", "index.min.js"), distIndex);
                // copy package.json
                fs.copyFileSync(path.join(outputDir, "package.json"), path.join(distPath, "package.json"));
                // copy package-lock.json
                fs.copyFileSync(path.join(outputDir, "package-lock.json"), path.join(distPath, "package-lock.json"));
            }

            if (project.build?.mode == FastApiBuildMode.DockerFile) {
                var npmrcPath = path.join(sourceDir, ".npmrc");
                var globalNpmrcPath = path.resolve('~/.npmrc');
                if (!fs.existsSync(npmrcPath) && !fs.existsSync(globalNpmrcPath)) {
                    npmrcPath = undefined;
                }
                else {
                    // copy .npmrc to dist

                    var mergedNpmrc = "";
                    if (globalNpmrcPath) {
                        mergedNpmrc += fs.readFileSync(globalNpmrcPath, 'utf-8');
                    }
                    if (npmrcPath) {
                        mergedNpmrc += fs.readFileSync(npmrcPath, 'utf-8');
                    }

                    fs.writeFileSync(path.join(distPath, ".npmrc"), mergedNpmrc);

                }
                project.makeDockerFile(distPath, distIndex, npmrcPath);
            }
        });
}

function recompileRoutes(baseName: string, routes: FastApiRoutePath[]) {
    var compiled = [
        `if(!Array.isArray(global.${FastApiRouteParameter}_${baseName})) global.${FastApiRouteParameter}_${baseName} = [];`,
        ...(routes.map(route => {
            return recompileRoute(baseName, route);
        }))
    ];

    return compiled.join("\n");
}

function recompileRoute(baseName: string, route: FastApiRoutePath) {
    var jsCode = fs.readFileSync(route.filename, 'utf-8');
    var topLevelRequires = jsCode.matchAll(/const (.*?) = require\((.*?)\)/g);
    var requires = [];
    for (let req of topLevelRequires) {
        requires.push({
            name: req[1],
            path: req[2].replace(/['"]/g, '')
        });
    }
    // get distinct requires
    requires = requires.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.path == v.path)) === i);
    jsCode = jsCode.replace(/const (.*?) = require\((.*?)\)/g, '');
    var recompiledRequires = "";
    for (let req of requires) {
        recompiledRequires += `const ${req.name} = require("${req.path}");`;
    }
    // remove sourceMappingUrl
    jsCode = jsCode.replace(/\/\/# sourceMappingURL=.*?$/gm, '');
    // remove strict
    jsCode = jsCode.replace(/"use strict";/g, '');
    // remove esmodule
    jsCode = jsCode.replace(/Object.defineProperty(exports, "__esModule", { value: true });/g, '');
    // convert exports as return
    jsCode = jsCode.replace(/exports\.(.*?) = (.*?);/g, 'return $2;');

    return `global.${FastApiRouteParameter}_${baseName}.push({
        aliases: ${JSON.stringify(route.aliases)},
        init: function() {${recompiledRequires}${jsCode}},
        path: "${route.pathname}",
        details: ${JSON.stringify(findHttpMethodByFileName(route.pathname))}
    });`;

}

function retrieveRouteDefinitions(outputDir: string, router: FastApiRoute, routes: FastApiRoutePath[]) {
    scanDir(path.join(outputDir, "dist", router.path)).forEach(f => {
        var relativePath = path.relative(path.join(outputDir, "dist", router.path), f.routePath);
        relativePath = ("/" + relativePath).replace(/\\/g, "/");
        var aliases = [];
        if (relativePath.endsWith("/index")) {
            aliases.push(relativePath.substring(0, relativePath.length - 6));
        }
        routes.push({
            pathname: relativePath,
            filename: f.realpath,
            aliases: aliases
        });
    });
}

function scanDir(scanPath?: string) {
    if (!scanPath) return null;
    var files = [];
    fs.readdirSync(scanPath, {
        withFileTypes: true
    }).forEach(dir => {
        if (dir.isDirectory()) {
            scanDir(path.join(scanPath, dir.name)).forEach(f => {
                files.push(f);
            });
        }
        else {
            if (dir.name.endsWith('.ts') || dir.name.endsWith('.js')) {
                files.push({
                    routePath: path.join(scanPath, path.basename(dir.name, path.extname(dir.name))),
                    realpath: path.join(scanPath, dir.name)
                });
            }
        }
    });
    return files;
}

function findHttpMethodByFileName(p: string) {
    var parts = p.split(path.sep);
    var expressRoutePath = "/" + parts.map(part => {
        return part.replace(/\[/g, ":").replace(/\]/g, "");
    }).join("/");
    var specificMethod = path.basename(expressRoutePath).split(".")[1];
    var httpMethod = expressRoutePath.indexOf(":") > -1 ? "get" : (specificMethod || "get");
    if (specificMethod == httpMethod && specificMethod) {
        expressRoutePath = expressRoutePath.replace("." + specificMethod, "");
    }
    return {
        detectedMethod: httpMethod,
        routePath: expressRoutePath?.replace((/\/{2,}/g), "/"),
        specificMethod: specificMethod
    }
}