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
        .option("-dp, --debug-port <port>", "Port to debug the server on")
        .description("Watch fast api server or run in development mode")
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

            // ? Run project
            console.log("Running...");
            var proc = null;

            var isBusy = false;
            var isFirstRun = true;
            async function restartServer() {
                if (isBusy) return;

                isBusy = true;
                if (proc) {
                    proc.kill();
                    proc = null;
                }

                var outputFileName = await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
                isFirstRun = false;
                // run script in debug mode
                proc = spawn("node", ["--inspect", outputFileName, "-p", args.debugPort || 9229], {
                    cwd: process.cwd(),
                    shell: true,
                    env: {
                        PORT: port,
                        NODE_ENV: "development"
                    }
                });
                proc.on('error', (err) => {
                    console.error(err);
                });
                proc.stdout.on('data', (data) => {
                    data = data?.toString()?.trim();
                    if (data && data.length > 0) {
                        console.log(data);
                    }
                });
                proc.stderr.on('data', (data) => {
                    data = data?.toString()?.trim();
                    if (data && data.length > 0) {
                        console.error(data);
                    }
                });
                proc.on('close', (code) => {
                    console.log(`Server exited with code ${code}`);
                });

                isBusy = false;
            }
            console.log("Watching...");
            console.log(path.join(process.cwd(), "src"));
            fs.watch(path.join(process.cwd(), "src"), { recursive: true }, async (eventType, filename) => {
                console.log(`File ${filename} changed`);
                console.log(`Restarting server...`);
                restartServer();
            });
            restartServer();
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
