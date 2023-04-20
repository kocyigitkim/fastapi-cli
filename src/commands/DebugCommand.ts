import { program } from "commander";
import { RegisterDebugConfigureCommand } from "./DebugCommands/ConfigureCommand";

export function RegisterDebugCommand() {
    const debug = program.command("debug");
    RegisterDebugConfigureCommand(debug);
}