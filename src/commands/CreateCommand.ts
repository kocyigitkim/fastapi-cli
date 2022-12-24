import { program } from "commander";
import { FastApiProject } from "../interface/FastApiProject";
import fs from "fs";
import path from "path";


export function RegisterCreateCommand() {
    program.command("create <path>")
        .option("-p, --path", "[Under construction] Use path to create a new resource")
        .description("Create a new resource")
        .action(async (path, options) => {
            var isPath = options.path;
            var outputDir = process.cwd();
            var project = FastApiProject.open(fs.readFileSync(path.join(outputDir, "fastapi.json"), 'utf-8'));
            await CreateRestAction(path, isPath).catch(console.error);
        });
}

async function CreateRestAction(path, isPath) {

}