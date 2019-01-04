import Team from "../../model/Team";
import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import {Container, Inject, Service} from "typedi";
import {IStandUpSettings, ITimezone} from "../../StandUpBotService";
import {Connection} from "typeorm";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";

@Service()
export class SettingsAction implements IHttpAction {
  constructor(private connection: Connection, @Inject(CONFIG_TOKEN) private config: IAppConfig) {

  }
  async handle(req, res) {
    const session = req.session
    const timezoneList = Container.get('timezoneList') as Promise<ITimezone[]>;

    if (!session.user) {
      res.send('Access deny') // TODO 403
      return;
    }
    const user = session.user;

    const teamRepository = this.connection.getRepository(Team)
    const channelRepository = this.connection.getRepository(Channel)
    let team = await teamRepository.findOne({id: user.team_id})
    if(!team) {
      // TODO 404
      throw new Error('team is not found');
    }

    if (req.method == "POST") {
      // todo validate
      const settings = <IStandUpSettings>req.body
      const channel_id = req.body.channel_id
      const channel = await channelRepository.findOne(channel_id)
      Object.assign(channel, settings)
      channelRepository.save(channel)
    }

    const authLink = 'https://slack.com/oauth/authorize?&client_id='+this.config.slackClientID+'&scope=bot,channels:read,team:read'

    res.send(pug.compileFile(`${templateDirPath}/settings.pug`)({
      team: user.team_name,
      authLink: authLink,
      channels: team.channels,
      timezoneList: await timezoneList,
      activeMenu: 'settings'
    }))
  }
}
