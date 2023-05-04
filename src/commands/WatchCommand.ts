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

            process.env.PORT = port.toString();

            // ? Run project
            console.log("Running...");
            var isDebug = args.debug;
            var isFirstRun = true;
            var restartCount = 0;
            async function startServer() {
                await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
                isFirstRun = false;
                var serverProcess = null;
                const watchFolderPath = path.join(process.cwd(), "src");
                const watchFolder = fs.watch(watchFolderPath, { recursive: true }, async (eventType, filename) => {
                    if (eventType == "change" || eventType == 'rename') {
                        var c = restartCount;
                        if (restartCount > 0) {
                            console.log(`Waiting previous restart. current queue: ${restartCount}`);
                            while (c == restartCount && c > 0 && restartCount > 0) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                        restartCount++;
                        //Kill current process
                        console.clear();
                        console.log("Restarting...");
                        serverProcess.kill();
                        // ? Rebuild
                        await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
                        // ? Run project
                        serverProcess = await ExecuteServer(outputFileName);
                        restartCount--;
                    }
                });

                serverProcess = await ExecuteServer(outputFileName);
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
async function ExecuteServer(outputFileName: string): Promise<any> {
    var outputDir = path.dirname(outputFileName);
    console.log("Executing file: " + outputFileName);
    var serverProcess = spawn("node", [
        outputFileName
    ], {
        argv0: "--inspect",
        cwd: outputDir,
        stdio: "inherit",
        detached: true,
        shell: true
    });
    return serverProcess;
}

