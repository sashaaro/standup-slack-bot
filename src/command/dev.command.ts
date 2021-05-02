import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {ServerCommand} from "./server.command";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {bind} from "../decorator/bind";
import {QueueConsumeCommand} from "./queue-consume.command";

export class DevCommand implements yargs.CommandModule {
  static meta = {
    command: 'dev',
    describe: 'Combine server:run standup:notify queue:consume for watcher'
  }

  constructor(
    @Inject(Injector) private injector: Injector,
  ) {
  }

  @bind
  async handler(args: yargs.Arguments<{}>) {
    const commands = [
      ServerCommand,
      StandupNotifyCommand,
      QueueConsumeCommand
    ]

    for (const command of commands) {
      const cmd = this.injector.get(command) as yargs.CommandModule
      await cmd.handler(args)
    }
  }
}
