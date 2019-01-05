import Team from "../../model/Team";
import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import {Inject, Service} from "typedi";
import {IStandUpSettings, ITimezone} from "../../StandUpBotService";
import {Connection} from "typeorm";
import {TIMEZONES_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";

@Service()
export class SettingsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(TIMEZONES_TOKEN) private timezoneList: Promise<ITimezone[]>
  ) {
  }

  async handle(req, res) {
    const session = req.session
    if (!session.user) {
      res.send('Access deny') // TODO 403
      return;
    }
    const user = session.user;

    const teamRepository = this.connection.getRepository(Team)
    const channelRepository = this.connection.getRepository(Channel)
    let team = await teamRepository.findOne({id: user.team_id})
    if (!team) {
      // TODO 404
      throw new Error('team is not found');
    }

    const channel = await channelRepository.findOne(session.channel)
    if (!channel) {
      // TODO 404
      throw new Error('team is not found');
    }

    if (req.method == "POST") {
      // todo validate
      const settings = <IStandUpSettings>req.body
      Object.assign(channel, settings)
      await channelRepository.save(channel)
    }

    res.send(pug.compileFile(`${templateDirPath}/settings.pug`)({
      team: team,
      channel: channel,
      timezoneList: await this.timezoneList,
      activeMenu: 'settings'
    }))
  }
}
