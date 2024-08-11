import { program } from "commander";
import path from 'path'
import fs from 'fs'
import { ShellProcess } from "cmd-execute";
import { FastApiProject } from "interface/FastApiProject";
import { ChildProcess, spawn } from "child_process";

const DoNothing = () => { };

interface ServerInfo {
    port: number;
    process: ChildProcess;
    watcher?: fs.FSWatcher;
}

const ListeningServers: ServerInfo[] = [];

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
            const projectDir = path.join(process.cwd());

            if (!port && fastapiJson) {
                port = fastapiJson.port;
            }

            if (!fastapiJson) {
                console.error("Could not find fastapi.json in current directory");
                process.exit(-1);
            }

            if (!process.env.PORT) process.env.PORT = port.toString();

            // ? Run project
            console.log("Running...");
            var isDebug = args.debug;
            var isFirstRun = true;
            var restartCount = 0;
            async function startServer() {
                await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
                isFirstRun = false;
                const watchFolderPath = path.join(process.cwd(), "src");

                async function onWatch(eventType, filename) {
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
                        // ? Rebuild
                        await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
                        // ? Run project
                        await ExecuteServer(projectDir, outputFileName, port);
                        // assign watcher to server process
                        ListeningServers.forEach(x => {
                            if (x.port == port) {
                                registerWatcher().then(watcher => {
                                    x.watcher = watcher;
                                });
                            }
                        });
                        restartCount--;
                    }
                }

                async function registerWatcher() {
                    const watchFolder = fs.watch(watchFolderPath, { recursive: true }, async (eventType, filename) => {
                        await onWatch(eventType, filename);
                    });
                    return watchFolder;
                }



                await ExecuteServer(projectDir, outputFileName, port);
                // assign watcher to server process
                ListeningServers.forEach(x => {
                    if (x.port == port) {
                        registerWatcher().then(watcher => {
                            x.watcher = watcher;
                        });
                    }
                });
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

async function ExecuteServer(projectDir: string, outputFileName: string, port?: number) {
    const portStatus = await CheckIsPortUsing(port);
    if (portStatus.busy) {
        if (portStatus.listeingOn) {
            await TerminateOldProcess();
        }
        else {
            console.error(`Port ${port} is already in use by another process`);
            process.exit(-1);
        }
    }

    console.log("Running server...");
    var serverProcess = await RunServer(projectDir, outputFileName, port);
    serverProcess.on("exit", () => {
        console.log("Server exited");
    });
}

async function RunServer(projectDir: string, entrypointFile: string, port: number) {
    var serverProcess = spawn("node", [entrypointFile], {
        argv0: "inspect",
        cwd: projectDir,
        stdio: "inherit",
        detached: false,
        env: {
            ...process.env,
            PORT: port.toString()
        }
    });
    ListeningServers.push({
        port: port,
        process: serverProcess
    });
    return serverProcess;
}

async function CheckIsPortUsing(port: number) {
    const isAvailable = await CheckIsPortAvailable(port);
    const isExistsOnListening = ListeningServers.find(x => x.port == port);
    return {
        busy: !isAvailable || isExistsOnListening,
        listeingOn: isExistsOnListening
    };
}

async function CheckIsPortAvailable(port: number) {
    return new Promise<boolean>((resolve) => {
        const server = require('net').createServer();
        server.listen(port, () => {
            server.close();
            resolve(true);
        });
        server.on('error', () => {
            resolve(false);
        });
    });
}

async function TerminateOldProcess() {
    while (ListeningServers.length > 0) {
        var server = ListeningServers[0];
        if (server.watcher) {
            console.log(`Closing watcher on port ${server.port}`);
            server.watcher.close();
        }
        console.log(`Killing server on port ${server.port}, pid: ${server.process.pid}`);
        if (server.process.kill(9)) {
            console.log(`Server on port ${server.port} killed, pid: ${server.process.pid}`);
            ListeningServers.shift();
        }
        else {
            console.log(`Failed to kill server on port ${server.port}, pid: ${server.process.pid}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return ListeningServers.length == 0;
}