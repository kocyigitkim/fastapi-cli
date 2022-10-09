import { program } from "commander";
import path from 'path'
import fs from 'fs'
import { ShellProcess } from "cmd-execute";
import { FastApiProject } from "interface/FastApiProject";

export function RegisterStartCommand() {
    program.command("start")
        .alias("dev")
        .option("-p, --port <port>", "Port to run the server on")
        .description("Start fast api server or run in development mode")
        .action(async (args) => {
            var port = args.port;
            // ? Load Package.json
            const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), 'utf-8'));
            // ? Load fastapi.json
            const fastapiJson: FastApiProject = JSON.parse(fs.readFileSync(path.join(process.cwd(), "fastapi.json"), 'utf-8'));

            if (!port && fastapiJson) {
                port = fastapiJson.port;
            }

            if (!fastapiJson) {
                console.error("Could not find fastapi.json in current directory");
                process.exit(-1);
            }

            // ? Clean output directory
            console.log("Cleaning...");
            const outputFileName = packageJson.main;
            var outputDir = path.dirname(outputFileName);
            if (fastapiJson.build?.output) {
                outputDir = path.resolve(process.cwd(), fastapiJson.build.output);
            }
            if (fs.existsSync(outputDir)) {
                fs.rmdirSync(outputDir, { recursive: true });
            }
            // ? Build project
            console.log("Building...");
            var isTTSC = Boolean(packageJson.devDependencies?.ttypescript);
            await new ShellProcess({
                path: "npx",
                args: [(isTTSC ? "ttsc" : "tsc"), "--build", "tsconfig.json"],
                cwd: process.cwd()
            }).run(console.log, console.error);
            console.log('Build complete');

            // ? Run project
            console.log("Running...");
            var hasError = false;
            // defines skip files
            await new ShellProcess({
                path: "node",
                args: [outputFileName, "--skip", "dist/**/*.d.ts"],
                cwd: process.cwd(),
                env: {
                    PORT: port,
                    NODE_ENV: "development"
                }
            }).run((log) => {
                log = log?.trim();
                if (log && log.length > 0) {
                    console.log(log);
                }
            }, (err) => {
                console.error(err);
                hasError = true;
            });
            if (!hasError) {
                console.log("Server running on port " + port);
            }
            else {
                console.error("Server failed to start");
            }
            console.log("Press Ctrl+C to stop");
        })
}