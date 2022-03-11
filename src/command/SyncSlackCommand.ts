import * as yargs from "yargs";
import {SyncSlackService} from "../slack/sync-slack.service";
import {Inject, Injectable} from "injection-js";
import {MIKRO_TOKEN} from "../services/token";
import SlackWorkspace from "../entity/slack-workspace";
import {emStorage} from "../services/providers";
import {bind} from "../decorator/bind";
import {initMikroORM} from "../services/utils";

@Injectable()
export class SyncSlackCommand implements yargs.CommandModule<any, any> {
  command = 'slack:sync'
  describe = 'Sync data from slack api'

  constructor(
    private syncSlackService: SyncSlackService,
    @Inject(MIKRO_TOKEN) private orm,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    await initMikroORM(this.orm)

    const workspaces = await this.orm.em.getRepository(SlackWorkspace).findAll()

    emStorage.run(this.orm.em, () => {
      for(const workspace of workspaces) {
        this.syncSlackService.syncForWorkspace(workspace)
      }
    })
  }
}
