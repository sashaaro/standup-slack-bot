import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {ServerCommand} from "./ServerCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {bind} from "../services/utils";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import {Connection} from "typeorm";
import SlackWorkspace from "../model/SlackWorkspace";

export class SyncSlackCommand implements yargs.CommandModule {
  command = 'slack:sync';
  describe = 'Sync data from slack api';

  constructor(
    @Inject(Injector) private injector: Injector
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
      cmd.handler(args)
    }

    await this.injector.get(Connection).connect()
    const workspaces = await this.injector.get(Connection).getRepository(SlackWorkspace).find()
    for(const workspace of workspaces) {
      await this.injector.get(SlackBotTransport).syncData(workspace)
    }
  }
}
