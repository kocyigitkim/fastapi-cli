import { Command, program } from 'commander'
import { FastApiClientDefinition } from '../../interface/FastApiClientDefinition';
import fs from 'fs'
import path from 'path'
import axios from 'axios';

export function InitClientUpdateCommand(parent: Command) {

    parent.command("update")
        .option("-u, --url [url]", "Enter the fast api url for retrieving client definitions and types")
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

                var definition: FastApiClientDefinition;
                var clientDefinitionPath = path.join(process.cwd(), "fastapi-client.json");

                if (fs.existsSync(clientDefinitionPath)) {
                    definition = FastApiClientDefinition.load(fs.readFileSync(clientDefinitionPath, "utf-8"));
                }
                else {
                    definition = new FastApiClientDefinition();
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
                fs.writeFileSync(clientDefinitionPath, definition.save());
                console.log("Client definition file updated.");
                console.log("Retrieving current client script...");

                const client = axios.create({ baseURL: url });
                const clientScript = await client.get("/fastapi/client", {}).catch(console.error);
                if (clientScript) {
                    const clientScriptPath = path.join(process.cwd(), output, "fastapi-client.js");
                    fs.writeFileSync(clientScriptPath, clientScript.data, "utf-8");
                    console.log("Client script updated.");
                }
                else {
                    console.log("Client script not updated.");
                    return;
                }
                if (typescript) {
                    const clientTypes = await client.get("/fastapi/types", {}).catch(console.error);
                    if (clientTypes) {
                        const clientTypesPath = path.join(process.cwd(), output, "fastapi-client.d.ts");
                        fs.writeFileSync(clientTypesPath, clientTypes.data, "utf-8");
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