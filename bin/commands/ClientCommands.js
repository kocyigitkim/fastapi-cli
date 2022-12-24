"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientCommands = void 0;
const commander_1 = require("commander");
const ClientUpdateCommand_1 = require("./ClientCommands/ClientUpdateCommand");
function ClientCommands() {
    const client = commander_1.program.command('client');
    client.description('Manage FastAPI clients');
    (0, ClientUpdateCommand_1.InitClientUpdateCommand)(client);
}
exports.ClientCommands = ClientCommands;
//# sourceMappingURL=ClientCommands.js.map