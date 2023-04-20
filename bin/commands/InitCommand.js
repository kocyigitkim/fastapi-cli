"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterInitCommand = void 0;
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FastApiProject_1 = require("../interface/FastApiProject");
const FastApiBuild_1 = require("../interface/FastApiBuild");
const FastApiBuildMode_1 = require("../interface/FastApiBuildMode");
const FastApiRouteType_1 = require("../interface/FastApiRouteType");
const cmd_execute_1 = require("cmd-execute");
function RegisterInitCommand() {
    commander_1.program.command("init")
        .option("-n, --name [name]", "Name of the project")
        .option("-o, --output [path]", "Output directory")
        .description("Create a new project")
        .action(async (args) => {
        if (!args)
            args = {};
        if (!(args === null || args === void 0 ? void 0 : args.output)) {
            args.output = process.cwd();
        }
        var projectDir = path_1.default.join(args.output, args.name);
        if (!(args === null || args === void 0 ? void 0 : args.name)) {
            // find package.json and retrieve name from package.json
            try {
                const packageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), "package.json"), 'utf-8'));
                args.name = packageJson.name;
            }
            catch (err) {
                console.error("Could not find package.json in current directory");
                if (args.name) {
                    fs_1.default.mkdirSync(projectDir, { recursive: true });
                    process.chdir(projectDir);
                    await new cmd_execute_1.ShellProcess({
                        path: "npm",
                        args: ["init", "-y"]
                    }).run(console.log, console.error);
                }
                else {
                    process.exit(1);
                }
            }
        }
        var project = new FastApiProject_1.FastApiProject();
        project.name = args.name;
        project.port = 5000;
        project.deps = [
            {
                name: "fastapi-next",
                version: "latest"
            }
        ];
        project.build = new FastApiBuild_1.FastApiBuild();
        project.build.bundle = false;
        project.build.compress = false;
        project.build.mode = FastApiBuildMode_1.FastApiBuildMode.Default;
        project.build.output = "dist";
        project.routers = [
            {
                type: FastApiRouteType_1.FastApiRouteType.REST,
                path: "routers"
            }
        ];
        if (!fs_1.default.existsSync(projectDir)) {
            fs_1.default.mkdirSync(projectDir, { recursive: true });
        }
        fs_1.default.writeFileSync(path_1.default.join(projectDir, "fastapi.json"), project.save());
        if (!fs_1.default.existsSync(path_1.default.join(projectDir, "tsconfig.json"))) {
            fs_1.default.writeFileSync(path_1.default.join(projectDir, "tsconfig.json"), project.buildTSConfig());
        }
        if (!fs_1.default.existsSync(path_1.default.join(projectDir, "src"))) {
            fs_1.default.mkdirSync(path_1.default.join(projectDir, "src"), { recursive: true });
        }
        if (!fs_1.default.existsSync(path_1.default.join(projectDir, "src", "routers"))) {
            fs_1.default.mkdirSync(path_1.default.join(projectDir, "src", "routers"), { recursive: true });
            if (!fs_1.default.existsSync(path_1.default.join(projectDir, "src", "routers", "index.ts"))) {
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "src", "routers", "index.ts"), project.buildHelloWorld());
            }
        }
        if (!fs_1.default.existsSync(path_1.default.join(projectDir, "src", "index.ts"))) {
            fs_1.default.writeFileSync(path_1.default.join(projectDir, "src", "index.ts"), project.buildIndex());
        }
        console.log("Project created successfully");
        console.log("Building package.json");
        var packageJson = {
            name: project.name,
            version: "1.0.0",
            description: "Project created with fastapi-cli",
            main: "dist/index.js",
            types: "dist/ts-types/index.d.ts",
            scripts: {
                "start": "fastapi start",
                "build": "fastapi build",
            },
            keywords: [],
            dependencies: {
                "fastapi-next": "latest",
                "express": "latest",
            },
            devDependencies: {
                "@types/express": "latest",
                "@types/node": "latest",
                "typescript": "latest",
            }
        };
        var existingPackageJson = fs_1.default.existsSync(path_1.default.join(projectDir, "package.json")) ? JSON.parse(fs_1.default.readFileSync(path_1.default.join(projectDir, "package.json"), 'utf-8')) : {};
        existingPackageJson.dependencies = Object.assign(Object.assign({}, existingPackageJson.dependencies), packageJson.dependencies);
        existingPackageJson.devDependencies = Object.assign(Object.assign({}, existingPackageJson.devDependencies), packageJson.devDependencies);
        existingPackageJson.name = packageJson.name;
        existingPackageJson.version = packageJson.version;
        existingPackageJson.description = packageJson.description;
        existingPackageJson.main = packageJson.main;
        existingPackageJson.types = packageJson.types;
        existingPackageJson.scripts = Object.assign(Object.assign({}, existingPackageJson.scripts), packageJson.scripts);
        existingPackageJson.keywords = packageJson.keywords;
        packageJson = existingPackageJson;
        var outputDir = projectDir;
        fs_1.default.writeFileSync(path_1.default.join(outputDir, "package.json"), JSON.stringify(packageJson, null, 2));
        // ? Create vscode environment
        if (!fs_1.default.existsSync(path_1.default.join(outputDir, ".vscode"))) {
            fs_1.default.mkdirSync(path_1.default.join(outputDir, ".vscode"), { recursive: true });
        }
        if (!fs_1.default.existsSync(path_1.default.join(outputDir, ".vscode", "launch.json"))) {
            fs_1.default.writeFileSync(path_1.default.join(outputDir, ".vscode", "launch.json"), project.buildVSCodeLaunch());
        }
        console.log("Installing dependencies...");
        await new cmd_execute_1.ShellProcess({
            path: "npm",
            args: ["install"],
            cwd: projectDir
        }).run(console.log, console.error).catch(console.error);
        console.log(project, args, projectDir);
    });
}
exports.RegisterInitCommand = RegisterInitCommand;
//# sourceMappingURL=InitCommand.js.map