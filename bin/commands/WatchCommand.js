"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterWatchCommand = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cmd_execute_1 = require("cmd-execute");
const child_process_1 = require("child_process");
const DoNothing = () => { };
const ListeningServers = [];
function RegisterWatchCommand() {
    commander_1.program.command("watch")
        .alias("dev")
        .option("-p, --port <port>", "Port to run the server on")
        .option("-d, --debug", "debug the server")
        .description("[Under construction] Watch fast api server or run in development mode")
        .action(async (args) => {
        var _a;
        var port = args.port;
        // ? Load Package.json
        const packageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), "package.json"), 'utf-8'));
        // ? Load fastapi.json
        const fastapiJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), "fastapi.json"), 'utf-8'));
        const outputFileName = path_1.default.join(process.cwd(), ((_a = fastapiJson.build) === null || _a === void 0 ? void 0 : _a.output) || "build", "index.js");
        const projectDir = path_1.default.join(process.cwd());
        if (!port && fastapiJson) {
            port = fastapiJson.port;
        }
        if (!fastapiJson) {
            console.error("Could not find fastapi.json in current directory");
            process.exit(-1);
        }
        if (!process.env.PORT)
            process.env.PORT = port.toString();
        // ? Run project
        console.log("Running...");
        var isDebug = args.debug;
        var isFirstRun = true;
        var restartCount = 0;
        async function startServer() {
            await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
            isFirstRun = false;
            const watchFolderPath = path_1.default.join(process.cwd(), "src");
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
                const watchFolder = fs_1.default.watch(watchFolderPath, { recursive: true }, async (eventType, filename) => {
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
        console.log(path_1.default.join(process.cwd(), "src"));
        startServer();
        console.log("Press Ctrl+C to stop");
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    });
}
exports.RegisterWatchCommand = RegisterWatchCommand;
async function CleanAndBuild(packageJson, fastapiJson, isFirstRun) {
    var _a, _b, _c;
    if (isFirstRun) {
        console.log("Cleaning...");
        const outputFileName = packageJson.main;
        var outputDir = path_1.default.dirname(outputFileName);
        if ((_a = fastapiJson.build) === null || _a === void 0 ? void 0 : _a.output) {
            outputDir = path_1.default.resolve(process.cwd(), fastapiJson.build.output);
        }
        if (fs_1.default.existsSync(outputDir)) {
            fs_1.default.rmdirSync(outputDir, { recursive: true });
        }
        // ? Build project
        console.log("Building...");
        var isTTSC = Boolean((_b = packageJson.devDependencies) === null || _b === void 0 ? void 0 : _b.ttypescript);
        await new cmd_execute_1.ShellProcess({
            path: "npx",
            args: [(isTTSC ? "ttsc" : "tsc"), "--build", "tsconfig.json"],
            cwd: process.cwd()
        }).run(console.log, console.error).catch(DoNothing);
        console.log('Build complete');
        return outputFileName;
    }
    else {
        // build only changed files
        var isTTSC = Boolean((_c = packageJson.devDependencies) === null || _c === void 0 ? void 0 : _c.ttypescript);
        await new cmd_execute_1.ShellProcess({
            path: "npx",
            args: [(isTTSC ? "ttsc" : "tsc"), "--build", "tsconfig.json", "--incremental"],
            cwd: process.cwd()
        }).run(console.log, console.error).catch(DoNothing);
        console.log('Build complete');
        return packageJson.main;
    }
}
async function ExecuteServer(projectDir, outputFileName, port) {
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
async function RunServer(projectDir, entrypointFile, port) {
    var serverProcess = (0, child_process_1.spawn)("node", [entrypointFile], {
        argv0: "inspect",
        cwd: projectDir,
        stdio: "inherit",
        detached: false,
        env: Object.assign(Object.assign({}, process.env), { PORT: port.toString() })
    });
    ListeningServers.push({
        port: port,
        process: serverProcess
    });
    return serverProcess;
}
async function CheckIsPortUsing(port) {
    const isAvailable = await CheckIsPortAvailable(port);
    const isExistsOnListening = ListeningServers.find(x => x.port == port);
    return {
        busy: !isAvailable || isExistsOnListening,
        listeingOn: isExistsOnListening
    };
}
async function CheckIsPortAvailable(port) {
    return new Promise((resolve) => {
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
//# sourceMappingURL=WatchCommand.js.map