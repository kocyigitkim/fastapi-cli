import { program } from "commander";
import { RegisterBuildCommand } from "./commands/BuildCommand";
import { RegisterInitCommand } from "./commands/InitCommand";

async function main() {

    RegisterInitCommand();
    RegisterBuildCommand();

    var cmd = await program.parseAsync().catch(console.error);
    if (cmd && cmd.commands.length == 0) {
        program.help();
    }
}

main();