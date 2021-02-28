import * as yargs from "yargs";
import {Connection} from "typeorm";
import SlackWorkspace from "../model/SlackWorkspace";
import {SyncSlackService} from "../slack/sync-slack.service";
import {Injectable} from "injection-js";
import {bind} from "../services/decorators";

@Injectable()
export class SyncSlackCommand implements yargs.CommandModule<any, any> {
  static meta: Partial<yargs.CommandModule<any, any>> = {
    command: 'slack:sync',
    describe: 'Sync data from slack api'
  };

  constructor(
    private connection: Connection,
    private syncSlackService: SyncSlackService
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    if (!this.connection.isConnected) {
      await this.connection.connect();
    }
    const workspaces = await this.connection.getRepository(SlackWorkspace).find()
    for(const workspace of workspaces) {
      await this.syncSlackService.syncForWorkspace(workspace)
    }
  }
}
