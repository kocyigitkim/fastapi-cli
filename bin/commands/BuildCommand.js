"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterBuildCommand = void 0;
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FastApiProject_1 = require("../interface/FastApiProject");
const cmd_execute_1 = require("cmd-execute");
const FastApiRouteType_1 = require("../interface/FastApiRouteType");
const FastApiBuildMode_1 = require("../interface/FastApiBuildMode");
const FastApiRouteParameter = "__fastapi_routes";
function RegisterBuildCommand() {
    commander_1.program.command("build")
        .option("-p, --project [path]", "Path to project file")
        .option("-o, --output [path]", "Output directory")
        .option("-d, --debug", "Debug mode")
        .description("Build the project")
        .action(async (args) => {
        var _a, _b, _c;
        if (!args)
            args = {};
        if (args === null || args === void 0 ? void 0 : args.project) {
            process.chdir(path_1.default.resolve(args.project));
            console.log("Changed directory to " + process.cwd());
        }
        if (!(args === null || args === void 0 ? void 0 : args.output)) {
            args.output = process.cwd();
        }
        const isDebugMode = Boolean((args === null || args === void 0 ? void 0 : args.debug) || false);
        var outputDir = path_1.default.resolve(args.output);
        var sourceDir = process.cwd();
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        var project = FastApiProject_1.FastApiProject.open(fs_1.default.readFileSync(path_1.default.join(outputDir, "fastapi.json"), 'utf-8'));
        // Remove dist folder
        if (fs_1.default.existsSync(path_1.default.join(outputDir, "dist"))) {
            fs_1.default.rmdirSync(path_1.default.join(outputDir, "dist"), { recursive: true });
            console.log('Dist folder removed');
        }
        // Remove bundle folder
        if (fs_1.default.existsSync(path_1.default.join(outputDir, "bundle"))) {
            fs_1.default.rmdirSync(path_1.default.join(outputDir, "bundle"), { recursive: true });
            console.log('Bundle folder removed');
        }
        // Build typescript
        await new cmd_execute_1.ShellProcess({
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
        var routes = [];
        var socketRoutes = [];
        if (Array.isArray(project.routers)) {
            for (var router of project.routers) {
                if (router.type == FastApiRouteType_1.FastApiRouteType.REST) {
                    retrieveRouteDefinitions(outputDir, router, routes);
                }
                else if (router.type == FastApiRouteType_1.FastApiRouteType.WEBSOCKET) {
                    retrieveRouteDefinitions(outputDir, router, socketRoutes);
                }
            }
        }
        var hasRestRoute = routes.length > 0;
        var hasSocketRoute = socketRoutes.length > 0;
        // Recompile routes
        var compiledRoutes = recompileRoutes(FastApiRouteType_1.FastApiRouteType.REST, routes);
        var compiledSocketRoutes = recompileRoutes(FastApiRouteType_1.FastApiRouteType.WEBSOCKET, socketRoutes);
        // Write routes to file
        var restRouteJSPath = `fastapi_${FastApiRouteType_1.FastApiRouteType.REST}_routes.js`;
        var socketRouteJSPath = `fastapi_${FastApiRouteType_1.FastApiRouteType.WEBSOCKET}_routes.js`;
        if (hasRestRoute)
            fs_1.default.writeFileSync(path_1.default.join(outputDir, "dist", restRouteJSPath), compiledRoutes);
        if (hasSocketRoute)
            fs_1.default.writeFileSync(path_1.default.join(outputDir, "dist", socketRouteJSPath), compiledSocketRoutes);
        // Clean old routes
        for (var router of project.routers) {
            var routerPath = path_1.default.join(outputDir, "dist", router.path);
            if (fs_1.default.existsSync(routerPath)) {
                fs_1.default.rmdirSync(routerPath, { recursive: true });
            }
        }
        var indexJs = fs_1.default.readFileSync(path_1.default.join(outputDir, "dist", "index.js"), 'utf-8');
        // import routes
        var imports = "";
        if (hasRestRoute)
            imports += "require('./" + restRouteJSPath + "');";
        if (hasSocketRoute)
            imports += "require('./" + socketRouteJSPath + "');";
        var globals = [];
        globals.push("process.env.DISABLE_SCAN_ROUTERS = true");
        indexJs = indexJs.replace(/"use strict";/, '"use strict";' + imports + globals.join("\n"));
        // rewrite index.js
        fs_1.default.writeFileSync(path_1.default.join(outputDir, "dist", "index.js"), indexJs);
        var distPath = path_1.default.join(outputDir, "dist");
        var distIndex = path_1.default.join(distPath, "index.js");
        if ((_a = project.build) === null || _a === void 0 ? void 0 : _a.compress) {
            // minify js
            await new cmd_execute_1.ShellProcess({
                path: "npx",
                args: ["terser", "--compress", "--mangle", "--output", path_1.default.join(distPath, "index.min.js"), path_1.default.join(distPath, "index.js")],
                cwd: process.cwd()
            }).run(console.log, console.error);
        }
        if ((_b = project.build) === null || _b === void 0 ? void 0 : _b.bundle) {
            // bundle js with node modules into one file
            await new cmd_execute_1.ShellProcess({
                path: "npx",
                args: ["pkg", "-t", "node16-alpine-x64", "dist/index.min.js", "--output", "bundle/index"],
                cwd: process.cwd()
            }).run(console.log, console.error);
            distPath = path_1.default.join(outputDir, "bundle");
            distIndex = path_1.default.join(distPath, "index");
        }
        else {
            distIndex = path_1.default.join(distPath, "index.js");
            // remove current index.js
            if (fs_1.default.existsSync(path_1.default.join(distPath, "index.js"))) {
                fs_1.default.unlinkSync(path_1.default.join(distPath, "index.js"));
            }
            // rename index.min.js to index.js
            fs_1.default.renameSync(path_1.default.join(outputDir, "dist", "index.min.js"), distIndex);
            // copy package.json
            fs_1.default.copyFileSync(path_1.default.join(outputDir, "package.json"), path_1.default.join(distPath, "package.json"));
            // copy package-lock.json
            fs_1.default.copyFileSync(path_1.default.join(outputDir, "package-lock.json"), path_1.default.join(distPath, "package-lock.json"));
        }
        if (((_c = project.build) === null || _c === void 0 ? void 0 : _c.mode) == FastApiBuildMode_1.FastApiBuildMode.DockerFile) {
            var npmrcPath = path_1.default.join(sourceDir, ".npmrc");
            var globalNpmrcPath = path_1.default.resolve('~/.npmrc');
            if (!fs_1.default.existsSync(npmrcPath) && !fs_1.default.existsSync(globalNpmrcPath)) {
                npmrcPath = undefined;
            }
            else {
                // copy .npmrc to dist
                var mergedNpmrc = "";
                if (globalNpmrcPath) {
                    mergedNpmrc += fs_1.default.readFileSync(globalNpmrcPath, 'utf-8');
                }
                if (npmrcPath) {
                    mergedNpmrc += fs_1.default.readFileSync(npmrcPath, 'utf-8');
                }
                fs_1.default.writeFileSync(path_1.default.join(distPath, ".npmrc"), mergedNpmrc);
            }
            project.makeDockerFile(distPath, distIndex, npmrcPath);
        }
    });
}
exports.RegisterBuildCommand = RegisterBuildCommand;
function recompileRoutes(baseName, routes) {
    var compiled = [
        `if(!Array.isArray(global.${FastApiRouteParameter}_${baseName})) global.${FastApiRouteParameter}_${baseName} = [];`,
        ...(routes.map(route => {
            return recompileRoute(baseName, route);
        }))
    ];
    return compiled.join("\n");
}
function recompileRoute(baseName, route) {
    var jsCode = fs_1.default.readFileSync(route.filename, 'utf-8');
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
function retrieveRouteDefinitions(outputDir, router, routes) {
    scanDir(path_1.default.join(outputDir, "dist", router.path)).forEach(f => {
        var relativePath = path_1.default.relative(path_1.default.join(outputDir, "dist", router.path), f.routePath);
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
function scanDir(scanPath) {
    if (!scanPath)
        return null;
    var files = [];
    fs_1.default.readdirSync(scanPath, {
        withFileTypes: true
    }).forEach(dir => {
        if (dir.isDirectory()) {
            scanDir(path_1.default.join(scanPath, dir.name)).forEach(f => {
                files.push(f);
            });
        }
        else {
            if (dir.name.endsWith('.ts') || dir.name.endsWith('.js')) {
                files.push({
                    routePath: path_1.default.join(scanPath, path_1.default.basename(dir.name, path_1.default.extname(dir.name))),
                    realpath: path_1.default.join(scanPath, dir.name)
                });
            }
        }
    });
    return files;
}
function findHttpMethodByFileName(p) {
    var parts = p.split(path_1.default.sep);
    var expressRoutePath = "/" + parts.map(part => {
        return part.replace(/\[/g, ":").replace(/\]/g, "");
    }).join("/");
    var specificMethod = path_1.default.basename(expressRoutePath).split(".")[1];
    var httpMethod = expressRoutePath.indexOf(":") > -1 ? "get" : (specificMethod || "get");
    if (specificMethod == httpMethod && specificMethod) {
        expressRoutePath = expressRoutePath.replace("." + specificMethod, "");
    }
    return {
        detectedMethod: httpMethod,
        routePath: expressRoutePath === null || expressRoutePath === void 0 ? void 0 : expressRoutePath.replace((/\/{2,}/g), "/"),
        specificMethod: specificMethod
    };
}
//# sourceMappingURL=BuildCommand.js.map