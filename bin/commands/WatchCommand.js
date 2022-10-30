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
        .option("-dp, --debug-port <port>", "Port to debug the server on")
        .description("Watch fast api server or run in development mode")
        .action(async (args) => {
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
        var isBusy = false;
        var isFirstRun = true;
        async function restartServer() {
            if (isBusy)
                return;
            isBusy = true;
            if (proc) {
                proc.kill();
                proc = null;
            }
            var outputFileName = await CleanAndBuild(packageJson, fastapiJson, isFirstRun);
            isFirstRun = false;
            // run script in debug mode
            proc = (0, child_process_1.spawn)("node", ["--inspect", outputFileName, "-p", args.debugPort || 9229], {
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
                var _a;
                data = (_a = data === null || data === void 0 ? void 0 : data.toString()) === null || _a === void 0 ? void 0 : _a.trim();
                if (data && data.length > 0) {
                    console.log(data);
                }
            });
            proc.stderr.on('data', (data) => {
                var _a;
                data = (_a = data === null || data === void 0 ? void 0 : data.toString()) === null || _a === void 0 ? void 0 : _a.trim();
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
        console.log(path_1.default.join(process.cwd(), "src"));
        fs_1.default.watch(path_1.default.join(process.cwd(), "src"), { recursive: true }, async (eventType, filename) => {
            console.log(`File ${filename} changed`);
            console.log(`Restarting server...`);
            restartServer();
        });
        restartServer();
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