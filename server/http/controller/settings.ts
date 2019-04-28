import Team from "../../model/Team";
import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import { ReflectiveInjector, Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {TIMEZONES_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";
import AuthorizationContext from "../../services/AuthorizationContext";
import QuestionRepository from "../../repository/QuestionRepository";
import {IStandUpSettings, ITimezone} from "../../bot/models";

@Injectable()
export class SettingsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(TIMEZONES_TOKEN) private timezoneList: Promise<ITimezone[]>,
    private authorizationContext: AuthorizationContext
  ) {
  }

  async handle(req, res) {
    const user = this.authorizationContext.getUser(req)
    if (!user) {
      res.send('Access deny') // TODO 403
      return;
    }

    const teamRepository = this.connection.getRepository(Team)
    const channelRepository = this.connection.getRepository(Channel)

    let team = await teamRepository.findOne(user.team_id)
    if (!team) {
      // TODO 404
      throw new Error('Team is not found');
    }

    const channel = await this.authorizationContext.getSelectedChannel(req)
    if (!channel) {
      // TODO 404
      throw new Error('Channel is not found');
    }

    if (req.method == "POST") { // TODO check if standup in progress then not dave
      // todo validate
      const formData = req.body as any
      if (formData.duration) {
        Object.assign(channel, formData as IStandUpSettings)
        await channelRepository.save(channel)
      }
      if (formData.questions) {
        await this.connection.getCustomRepository(QuestionRepository).updateForChannel(formData.questions, channel)
      }

      return res.redirect('/settings');
    }

    res.send(pug.compileFile(`${templateDirPath}/settings.pug`)({
      team: team,
      channel: channel,
      timezoneList: await this.timezoneList,
      activeMenu: 'settings'
    }))
  }
}
