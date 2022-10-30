import { program } from "commander";
import fs from 'fs'
import path from 'path'
import { FastApiProject } from "../interface/FastApiProject";
import { FastApiBuild } from "../interface/FastApiBuild";
import { FastApiBuildMode } from "../interface/FastApiBuildMode";
import { FastApiRouteType } from "../interface/FastApiRouteType";
import { ShellProcess } from 'cmd-execute'

export function RegisterInitCommand() {
    program.command("init")
        .option("-n, --name [name]", "Name of the project")
        .option("-o, --output [path]", "Output directory")
        .description("Create a new project")
        .action(async (args: {
            name?: string
            output?: string
        }) => {
            if (!args) args = {};
            if (!args?.output) {
                args.output = process.cwd();
            }
            if (!args?.name) {
                // find package.json and retrieve name from package.json
                try {
                    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), 'utf-8'));
                    args.name = packageJson.name;
                } catch (err) {
                    console.error("Could not find package.json in current directory");
                    process.exit(1);
                }
            }

            var project = new FastApiProject();
            project.name = args.name;
            project.port = 5000;
            project.deps = [
                {
                    name: "fastapi-next",
                    version: "latest"
                }
            ];
            project.build = new FastApiBuild();
            project.build.bundle = true;
            project.build.compress = true;
            project.build.mode = FastApiBuildMode.Default;
            project.build.output = "dist";
            project.routers = [
                {
                    type: FastApiRouteType.REST,
                    path: "routers"
                }
            ];

            var outputDir = path.resolve(args.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(path.join(outputDir, "fastapi.json"), project.save());
            if (!fs.existsSync(path.join(outputDir, "tsconfig.json"))) {
                fs.writeFileSync(path.join(outputDir, "tsconfig.json"), project.buildTSConfig());
            }
            if (!fs.existsSync(path.join(outputDir, "src"))) {
                fs.mkdirSync(path.join(outputDir, "src"), { recursive: true });
            }
            if (!fs.existsSync(path.join(outputDir, "src", "routers"))) {
                fs.mkdirSync(path.join(outputDir, "src", "routers"), { recursive: true });
                if (!fs.existsSync(path.join(outputDir, "src", "routers", "index.ts"))) {
                    fs.writeFileSync(path.join(outputDir, "src", "routers", "index.ts"), project.buildHelloWorld());
                }
            }

            if (!fs.existsSync(path.join(outputDir, "src", "index.ts"))) {
                fs.writeFileSync(path.join(outputDir, "src", "index.ts"), project.buildIndex());
            }

            console.log("Project created successfully");

            console.log("Building package.json");

            var packageJson = {
                name: project.name,
                version: "1.0.0",
                description: "",
                main: "dist/index.js",
                scripts: {
                    "start": "fastapi start",
                    "build": "fastapi build",
                    "prepare-debug": "fastapi build --debug"
                },
                keywords: [],
                dependencies: {
                    "fastapi-next": "latest",
                    "express": "latest",
                    "tst-reflect": "latest"
                },
                devDependencies: {
                    "@types/express": "latest",
                    "@types/node": "latest",
                    "typescript": "latest",
                    "tst-reflect-transformer": "latest",
                    "ttypescript": "latest"
                }
            };

            var existingPackageJson = fs.existsSync(path.join(outputDir, "package.json")) ? JSON.parse(fs.readFileSync(path.join(outputDir, "package.json"), 'utf-8')) : {};
            existingPackageJson.dependencies = { ...existingPackageJson.dependencies, ...packageJson.dependencies };
            existingPackageJson.devDependencies = { ...existingPackageJson.devDependencies, ...packageJson.devDependencies };
            existingPackageJson.name = packageJson.name;
            existingPackageJson.version = packageJson.version;
            existingPackageJson.description = packageJson.description;
            existingPackageJson.main = packageJson.main;
            existingPackageJson.scripts = { ...existingPackageJson.scripts, ...packageJson.scripts };
            existingPackageJson.keywords = packageJson.keywords;
            packageJson = existingPackageJson;
            fs.writeFileSync(path.join(outputDir, "package.json"), JSON.stringify(packageJson, null, 2));
            
            // ? Create vscode environment
            if (!fs.existsSync(path.join(outputDir, ".vscode"))) {
                fs.mkdirSync(path.join(outputDir, ".vscode"), { recursive: true });
            }
            if (!fs.existsSync(path.join(outputDir, ".vscode", "launch.json"))) {
                fs.writeFileSync(path.join(outputDir, ".vscode", "launch.json"), project.buildVSCodeLaunch());
            }
            if (!fs.existsSync(path.join(outputDir, ".vscode", "tasks.json"))) {
                fs.writeFileSync(path.join(outputDir, ".vscode", "tasks.json"), project.buildVSCodeTasks());
            }

            console.log("Installing dependencies...");
            await new ShellProcess({
                path: "npm",
                args: ["install"],
                cwd: outputDir
            }).run(console.log, console.error).catch(console.error);

            console.log(project, args, outputDir);
        });
}