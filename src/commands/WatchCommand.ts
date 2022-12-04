import { program } from "commander";
import path from 'path'
import fs from 'fs'
import { ShellProcess } from "cmd-execute";
import { FastApiProject } from "interface/FastApiProject";
import { spawn } from "child_process";

const DoNothing = () => { };

export function RegisterWatchCommand() {
    program.command("watch")
        .alias("dev")
        .option("-p, --port <port>", "Port to run the server on")
        .option("-d, --debug", "debug the server")
        .description("[Under construction] Watch fast api server or run in development mode")
        .action(async (args) => {
            console.log("Under construction");
            // process.exit(0);
            // return;
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

            // ? Run project
            console.log("Running...");
            var proc: ShellProcess = null;
            var isDebug = args.debug;
            var isFirstRun = true;
            async function startServer() {
                if (proc) {
                    (proc as any).currentProcess.kill("SIGTERM");
                    // wait for process to exit
                    while (!(proc as any).currentProcess.killed) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                var outputFileName = await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
                isFirstRun = false;

                proc = new ShellProcess({
                    path: "nodemon",
                    args: isDebug ? (
                        ["-x", '"fastapi start -d"', "-w", "src", "-w", "fastapi.json", "-w", "package.json", "-w", "tsconfig.json", "-e", "ts,json,js"]
                    ) : (["start", "--watch", "src", "--ext", "ts,js,json", "--exec", "fastapi"]),
                    cwd: process.cwd(),
                    env: {
                        PORT: port,
                        NODE_ENV: "development"
                    }
                } as any);
                await proc.run((d) => {
                    var lines = (d || "").split("\n");
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.trim().length > 0) {
                            console.log(line);
                        }
                    }
                }, (d) => {
                    var lines = (d || "").split("\n");
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.trim().length > 0) {
                            console.error(line);
                        }
                    }
                }).catch(console.error);

            }
            console.log("Watching...");
            console.log(path.join(process.cwd(), "src"));

            startServer();
            console.log("Press Ctrl+C to stop");
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        })
}

async function CleanAndBuild(packageJson: any, fastapiJson: FastApiProject, isFirstRun: boolean) {
    if (isFirstRun) {
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
        }).run(console.log, console.error).catch(DoNothing);
        console.log('Build complete');
        return outputFileName;
    }
    else {
        // build only changed files
        var isTTSC = Boolean(packageJson.devDependencies?.ttypescript);
        await new ShellProcess({
            path: "npx",
            args: [(isTTSC ? "ttsc" : "tsc"), "--build", "tsconfig.json", "--incremental"],
            cwd: process.cwd()
        }).run(console.log, console.error).catch(DoNothing);
        console.log('Build complete');
        return packageJson.main;

    }
}
