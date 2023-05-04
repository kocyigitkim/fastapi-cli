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
            const watchFolderPath = path_1.default.join(process.cwd(), "src");
            const watchFolder = fs_1.default.watch(watchFolderPath, { recursive: true }, async (eventType, filename) => {
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
async function ExecuteServer(outputFileName) {
    var outputDir = path_1.default.dirname(outputFileName);
    console.log("Executing file: " + outputFileName);
    var serverProcess = (0, child_process_1.spawn)("node", [
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
//# sourceMappingURL=WatchCommand.js.map