import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {ServerCommand} from "./ServerCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {bind} from "../services/utils";

export class DevCommand implements yargs.CommandModule {
    command = 'dev';
    describe = 'Combine server:run standup:notify queue:consume';

    constructor(
        @Inject(Injector) private injector: Injector
    ) {}

    @bind
    async handler(args: yargs.Arguments<{}>) {
        const commands = [
            ServerCommand,
            StandupNotifyCommand,
            QueueConsumeCommand
        ]

        args.queue = 'main'; // TODO
        for(const command of commands) {
            const cmd = this.injector.get(command) as yargs.CommandModule
            cmd.handler(args)
        }
    }
}
