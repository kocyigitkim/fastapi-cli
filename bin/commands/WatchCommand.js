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
const DoNothing = () => { };
function RegisterWatchCommand() {
    commander_1.program.command("watch")
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
        const packageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), "package.json"), 'utf-8'));
        // ? Load fastapi.json
        const fastapiJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), "fastapi.json"), 'utf-8'));
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
        var isDebug = args.debug;
        var isFirstRun = true;
        async function startServer() {
            if (proc) {
                proc.currentProcess.kill("SIGTERM");
                // wait for process to exit
                while (!proc.currentProcess.killed) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            var outputFileName = await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
            isFirstRun = false;
            proc = new cmd_execute_1.ShellProcess({
                path: "nodemon",
                args: isDebug ? (["-x", '"fastapi start -d"', "-w", "src", "-w", "fastapi.json", "-w", "package.json", "-w", "tsconfig.json", "-e", "ts,json,js"]) : (["start", "--watch", "src", "--ext", "ts,js,json", "--exec", "fastapi"]),
                cwd: process.cwd(),
                env: {
                    PORT: port,
                    NODE_ENV: "development"
                }
            });
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
//# sourceMappingURL=WatchCommand.js.map