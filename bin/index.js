#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const StartCommand_1 = require("./commands/StartCommand");
const BuildCommand_1 = require("./commands/BuildCommand");
const InitCommand_1 = require("./commands/InitCommand");
async function main() {
    (0, InitCommand_1.RegisterInitCommand)();
    (0, BuildCommand_1.RegisterBuildCommand)();
    (0, StartCommand_1.RegisterStartCommand)();
    var cmd = await commander_1.program.parseAsync().catch(console.error);
    if (cmd && cmd.commands.length == 0) {
        commander_1.program.help();
    }
}
main();
//# sourceMappingURL=index.js.map