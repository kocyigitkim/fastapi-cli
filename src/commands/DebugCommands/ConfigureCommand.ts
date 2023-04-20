import { Command } from "commander";
import { FastApiProject } from "interface/FastApiProject";
import path from "path";
import fs from 'fs';

export function RegisterDebugConfigureCommand(debug: Command) {
    debug.command("configure")
        .alias("init")
        .description("Configure debug settings")
        .option("-p, --port <port>", "Port to run the server on")
        .action(async (args) => {
            var port = args.port;
            // ? Load Package.json
            const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), 'utf-8'));
            // ? Load fastapi.json
            const fastapiJson: FastApiProject = JSON.parse(fs.readFileSync(path.join(process.cwd(), "fastapi.json"), 'utf-8'));
            const outputFileName = path.join(process.cwd(), fastapiJson.build?.output || "build", "index.js");

            if (!port && fastapiJson) {
                port = fastapiJson.port;
            }

            if (!fastapiJson) {
                console.error("Could not find fastapi.json in current directory");
                process.exit(-1);
            }

            // ? Configure vscode launch.json

            var currentLaunchJson = {};
            if (fs.existsSync(path.join(process.cwd(), ".vscode", "launch.json"))) {
                var launchJson = fs.readFileSync(path.join(process.cwd(), ".vscode", "launch.json"), 'utf-8');
                //remove comments by regex
                launchJson = launchJson.replace(/\/\/.*$/gm, '');

                currentLaunchJson = JSON.parse(launchJson);

            }

            // ? Check if debug configuration already exists
            var debugConfigExists = false;
            if (currentLaunchJson["configurations"]) {
                for (var i = 0; i < currentLaunchJson["configurations"].length; i++) {
                    if (currentLaunchJson["configurations"][i].name == "Debug") {
                        debugConfigExists = true;
                        break;
                    }
                }
            }

            if (!debugConfigExists) {
                currentLaunchJson["configurations"] = currentLaunchJson["configurations"] || [];
                currentLaunchJson["configurations"].push({
                    "type": "node",
                    "request": "launch",
                    "name": "Debug",
                    "skipFiles": [
                        "<node_internals>/**"
                    ],
                    "runtimeExecutable": "fastapi",
                    "args": [
                        "watch"
                    ],
                    "env": {
                        "PORT": (port?.toString()) ?? "5000"
                    }
                });
            }

            console.log(currentLaunchJson);

            const vscodeDir = path.join(process.cwd(), ".vscode");
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(path.join(process.cwd(), ".vscode"), { recursive: true });
            }
            fs.writeFileSync(path.join(process.cwd(), ".vscode", "launch.json"), JSON.stringify(currentLaunchJson, null, 4));
        });
}