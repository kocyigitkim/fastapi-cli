"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterDebugConfigureCommand = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function RegisterDebugConfigureCommand(debug) {
    debug.command("configure")
        .alias("init")
        .description("Configure debug settings")
        .option("-p, --port <port>", "Port to run the server on")
        .action(async (args) => {
        var _a, _b;
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
        // ? Configure vscode launch.json
        var currentLaunchJson = {};
        if (fs_1.default.existsSync(path_1.default.join(process.cwd(), ".vscode", "launch.json"))) {
            var launchJson = fs_1.default.readFileSync(path_1.default.join(process.cwd(), ".vscode", "launch.json"), 'utf-8');
            //remove comments by regex
            launchJson = launchJson.replace(/\/\/.*$/gm, '');
            currentLaunchJson = JSON.parse(launchJson);
        }
        // ? Check if debug configuration already exists
        var debugConfigExists = false;
        if (currentLaunchJson["configurations"]) {
            for (var i = 0; i < currentLaunchJson["configurations"].length; i++) {
                if (currentLaunchJson["configurations"][i].name == "Debug") {
                    debugConfigExists = true;
                    break;
                }
            }
        }
        if (!debugConfigExists) {
            currentLaunchJson["configurations"] = currentLaunchJson["configurations"] || [];
            currentLaunchJson["configurations"].push({
                "type": "node",
                "request": "launch",
                "name": "Debug",
                "skipFiles": [
                    "<node_internals>/**"
                ],
                "runtimeExecutable": "fastapi",
                "args": [
                    "watch"
                ],
                "env": {
                    "PORT": (_b = (port === null || port === void 0 ? void 0 : port.toString())) !== null && _b !== void 0 ? _b : "5000"
                }
            });
        }
        console.log(currentLaunchJson);
        const vscodeDir = path_1.default.join(process.cwd(), ".vscode");
        if (!fs_1.default.existsSync(vscodeDir)) {
            fs_1.default.mkdirSync(path_1.default.join(process.cwd(), ".vscode"), { recursive: true });
        }
        fs_1.default.writeFileSync(path_1.default.join(process.cwd(), ".vscode", "launch.json"), JSON.stringify(currentLaunchJson, null, 4));
    });
}
exports.RegisterDebugConfigureCommand = RegisterDebugConfigureCommand;
//# sourceMappingURL=ConfigureCommand.js.map