"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterStartCommand = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cmd_execute_1 = require("cmd-execute");
function RegisterStartCommand() {
    commander_1.program.command("start")
        .alias("dev")
        .option("-p, --port <port>", "Port to run the server on")
        .option("-d, --debug", "debug the server")
        .description("Start fast api server or run in development mode")
        .action(async (args) => {
        var _a, _b;
        var port = args.port;
        var isdebug = args.debug;
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
        // ? Clean output directory
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
        }).run(console.log, console.error);
        console.log('Build complete');
        // ? Run project
        console.log("Running...");
        var hasError = false;
        // defines skip files
        if (isdebug) {
            console.log("Debug mode enabled");
        }
        await new cmd_execute_1.ShellProcess({
            path: "node",
            args: isdebug ? (["--inspect", outputFileName, "--skip", "dist/**/*.d.ts"]) : ([outputFileName, "--skip", "dist/**/*.d.ts"]),
            cwd: process.cwd(),
            env: {
                PORT: port,
                NODE_ENV: "development"
            }
        }).run((log) => {
            log = log === null || log === void 0 ? void 0 : log.trim();
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
    });
}
exports.RegisterStartCommand = RegisterStartCommand;
//# sourceMappingURL=StartCommand.js.map