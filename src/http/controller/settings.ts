import Team from "../../model/Team";
import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {TIMEZONES_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";
import AuthorizationContext from "../../services/AuthorizationContext";
import QuestionRepository from "../../repository/QuestionRepository";
import {IStandUpSettings, ITimezone} from "../../bot/models";
import Timezone from "../../model/Timezone";

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

    const timezones = await this.timezoneList

    if (req.method == "POST") { // TODO check if standup in progress then not dave
      // todo validate
      const formData = req.body as {timezone: number, duration: number, questions: string[], start: string}
      if (formData.timezone) {
        const timezone = timezones.filter((t: any) => t.id.toString() === formData.timezone).pop() as Timezone;
        if (timezone) {
          channel.timezone = timezone;
        }
      }
      if (formData.duration) {
        Object.assign(channel, formData as any)
        await channelRepository.save(channel)
      }
      if (formData.questions) {
        await this.connection.getCustomRepository(QuestionRepository).updateForChannel(formData.questions, channel)
      }

      return res.redirect('/settings');
    }

    const weekDays = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ];

    res.send(pug.compileFile(`${templateDirPath}/settings.pug`)({
      team,
      channel,
      timezones,
      activeMenu: 'settings',
      weekDays
    }))
  }
}
