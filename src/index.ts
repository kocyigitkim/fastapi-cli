#!/usr/bin/env node
import { program } from "commander";
import { RegisterStartCommand } from "./commands/StartCommand";
import { RegisterBuildCommand } from "./commands/BuildCommand";
import { RegisterInitCommand } from "./commands/InitCommand";
import { RegisterWatchCommand } from "./commands/WatchCommand";
import { RegisterCreateCommand } from "./commands/CreateCommand";

async function main() {

    RegisterCreateCommand();
    RegisterInitCommand();
    RegisterBuildCommand();
    RegisterStartCommand();
    RegisterWatchCommand();

    var cmd = await program.parseAsync().catch(console.error);
    if (cmd && cmd.commands.length == 0) {
        program.help();
    }
}

main();