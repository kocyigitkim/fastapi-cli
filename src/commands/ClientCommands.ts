import { program } from "commander"
import { InitClientUpdateCommand } from "./ClientCommands/ClientUpdateCommand"

export function ClientCommands(){
    const client = program.command('client')
    client.description('Manage FastAPI clients')
    InitClientUpdateCommand(client);
}