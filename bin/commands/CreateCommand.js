"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterCreateCommand = void 0;
const commander_1 = require("commander");
const FastApiProject_1 = require("../interface/FastApiProject");
const fs_1 = __importDefault(require("fs"));
function RegisterCreateCommand() {
    commander_1.program.command("create <path>")
        .option("-p, --path", "[Under construction] Use path to create a new resource")
        .description("Create a new resource")
        .action(async (path, options) => {
        var isPath = options.path;
        var outputDir = process.cwd();
        var project = FastApiProject_1.FastApiProject.open(fs_1.default.readFileSync(path.join(outputDir, "fastapi.json"), 'utf-8'));
        await CreateRestAction(path, isPath).catch(console.error);
    });
}
exports.RegisterCreateCommand = RegisterCreateCommand;
async function CreateRestAction(path, isPath) {
}
//# sourceMappingURL=CreateCommand.js.map