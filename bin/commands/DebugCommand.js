"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterDebugCommand = void 0;
const commander_1 = require("commander");
const ConfigureCommand_1 = require("./DebugCommands/ConfigureCommand");
function RegisterDebugCommand() {
    const debug = commander_1.program.command("debug");
    (0, ConfigureCommand_1.RegisterDebugConfigureCommand)(debug);
}
exports.RegisterDebugCommand = RegisterDebugCommand;
//# sourceMappingURL=DebugCommand.js.map