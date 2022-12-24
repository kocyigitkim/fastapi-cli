"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitClientUpdateCommand = void 0;
const FastApiClientDefinition_1 = require("../../interface/FastApiClientDefinition");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
function InitClientUpdateCommand(parent) {
    parent.command("update")
        .option("-u, --url", "Enter the fast api url for retrieving client definitions and types")
        .option("-t, --typescript", "Enable typescript support")
        .option("-o, --output [path]", "Enter the output path for the client script and types")
        .option("-w, --watch", "Enable watch mode")
        .option("-n, --interval [interval]", "Set watch mode interval to update client script and types")
        .action(async (args) => {
        var { url, typescript, output, watch, interval } = args;
        async function updateFiles() {
            if (!output) {
                output = "./";
            }
            if (!url) {
                url = "http://localhost:5000";
            }
            if (!typescript) {
                typescript = true;
            }
            console.log("Updating client...");
            console.log("Url: " + url);
            console.log("Typescript: " + typescript);
            console.log("Output: " + output);
            var definition;
            var clientDefinitionPath = path_1.default.join(process.cwd(), "fastapi-client.json");
            if (fs_1.default.existsSync(clientDefinitionPath)) {
                definition = FastApiClientDefinition_1.FastApiClientDefinition.load(fs_1.default.readFileSync(clientDefinitionPath, "utf-8"));
            }
            else {
                definition = new FastApiClientDefinition_1.FastApiClientDefinition();
            }
            if (url) {
                definition.url = url;
            }
            if (typescript != undefined) {
                definition.typescript = typescript;
            }
            if (args.output != undefined) {
                definition.outputPath = output || "";
            }
            output = definition.outputPath;
            fs_1.default.writeFileSync(clientDefinitionPath, definition.save());
            console.log("Client definition file updated.");
            console.log("Retrieving current client script...");
            const client = axios_1.default.create({ baseURL: url });
            const clientScript = await client.get("/fastapi/client", {}).catch(console.error);
            if (clientScript) {
                const clientScriptPath = path_1.default.join(process.cwd(), output, "fastapi-client.js");
                fs_1.default.writeFileSync(clientScriptPath, clientScript.data, "utf-8");
                console.log("Client script updated.");
            }
            else {
                console.log("Client script not updated.");
                return;
            }
            if (typescript) {
                const clientTypes = await client.get("/fastapi/types", {}).catch(console.error);
                if (clientTypes) {
                    const clientTypesPath = path_1.default.join(process.cwd(), output, "fastapi-client.d.ts");
                    fs_1.default.writeFileSync(clientTypesPath, clientTypes.data, "utf-8");
                    console.log("Client types updated.");
                }
                else {
                    console.log("Client types not updated.");
                    return;
                }
            }
        }
        updateFiles();
        if (watch) {
            console.log("Watching for changes...");
            var intervalValue = interval || 5000;
            setInterval(() => {
                updateFiles();
            }, intervalValue);
            console.log("Press CTRL+C to stop watching.");
        }
    });
}
exports.InitClientUpdateCommand = InitClientUpdateCommand;
//# sourceMappingURL=ClientUpdateCommand.js.map