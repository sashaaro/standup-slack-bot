import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN, TIMEZONES_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";
import QuestionRepository from "../../repository/QuestionRepository";
import {ITimezone} from "../../bot/models";
import Timezone from "../../model/Timezone";
import AuthorizationContext from "../../services/AuthorizationContext";

@Injectable()
export class SettingsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(TIMEZONES_TOKEN) private timezoneList: Promise<ITimezone[]>,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser()
    if (!user) {
      res.send('Access deny') // TODO 403
      return;
    }

    const channelRepository = this.connection.getRepository(Channel)

    const globalParams = await context.getGlobalParams()
    const {team, channel} = globalParams

    if (!team) { // TODO 404
      throw new Error('Team is not found');
    }

    if (!channel) { // TODO 404
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

      res.redirect('/settings');
      return;
    }

    const weekDays = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ];

    res.send(this.render('settings', Object.assign({
      team,
      channel,
      timezones,
      activeMenu: 'settings',
      weekDays
    }, globalParams)))
  }
}
