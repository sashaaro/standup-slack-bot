import * as yargs from "yargs";
import {SyncSlackService} from "../slack/sync-slack.service";
import {Inject, Injectable} from "injection-js";
import {MIKRO_TOKEN} from "../services/token";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import SlackWorkspace from "../entity/slack-workspace";
import {emStorage} from "../services/providers";
import {bind} from "../decorator/bind";

@Injectable()
export class SyncSlackCommand implements yargs.CommandModule<any, any> {
  static meta: Partial<yargs.CommandModule<any, any>> = {
    command: 'slack:sync',
    describe: 'Sync data from slack api'
  };

  constructor(
    private syncSlackService: SyncSlackService,
    @Inject(MIKRO_TOKEN) private mikroORM: MikroORM<PostgreSqlDriver>,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    if (!await this.mikroORM.isConnected()) {
      await this.mikroORM.connect()
    }

    const workspaces = await this.mikroORM.em.getRepository(SlackWorkspace).findAll()

    emStorage.run(this.mikroORM.em, () => {
      for(const workspace of workspaces) {
        this.syncSlackService.syncForWorkspace(workspace)
      }
    })
  }
}
