import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {ServerCommand} from "./server.command";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {bind} from "../decorator/bind";
import {WorkerCommand} from "./WorkerCommand";

export class DevCommand implements yargs.CommandModule {
  command = 'dev'
  describe = 'Combine server:run standup:notify queue:consume for watcher'

  constructor(
    @Inject(Injector) private injector: Injector,
  ) {
  }

  @bind
  async handler(args: yargs.Arguments<{}>) {
    const commands = [
      ServerCommand,
      StandupNotifyCommand,
      WorkerCommand
    ]

    for (const command of commands) {
      const cmd = this.injector.get(command) as yargs.CommandModule
      await cmd.handler(args)
    }
  }
}
