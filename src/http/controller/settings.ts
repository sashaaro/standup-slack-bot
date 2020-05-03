import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN, TIMEZONES_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";
import {ITimezone} from "../../bot/models";
import Timezone from "../../model/Timezone";
import DashboardContext from "../../services/DashboardContext";
import {AccessDenyError, ResourceNotFoundError} from "../dashboardExpressMiddleware";
import {plainToClassFromExist, Type} from "class-transformer";
import {ValidateNested, IsNotEmpty, validate, MinLength, MaxLength, IsInt, Min, Max, ValidationError} from "class-validator";

class QuestionFormDTO {
  @IsNotEmpty()
  id: number
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  text: string
}
class SettingsFormDTO {
  @IsNotEmpty()
  timezone: number
  @IsNotEmpty()
  @IsInt()
  @Min(2)
  @Max(59)
  duration: number
  @Type(() => QuestionFormDTO)
  @IsNotEmpty()
  @ValidateNested()
  questions: QuestionFormDTO[]
  @IsNotEmpty()
  start: string
}

interface ViewError {
  errors: string[]
  children: { [key: string]: ViewError }
}

const transformViewErrors = (errors: ValidationError[]): { [key: string]: ViewError } => {
  const err: { [key: string]: ViewError } = {};
  errors.forEach(error => {
    err[error.property] = {
      errors: error.constraints ? Object.values(error.constraints) : [],
      children: transformViewErrors(error.children)
    } as ViewError
  })
  return err;
}

@Injectable()
export class SettingsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(TIMEZONES_TOKEN) private timezoneList: Promise<ITimezone[]>,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  async handle(req, res) {
    const context = req.context as DashboardContext;
    const channelRepository = this.connection.getRepository(Channel)

    if (!context.user) {
      throw new AccessDenyError();
    }

    if (!context.channel) {
      throw new ResourceNotFoundError('Selected channel is not found');
    }

    const timezones = await this.timezoneList
    const formData = new SettingsFormDTO();


    let viewErrors = {};
    const channel = context.channel

    if (req.method === "POST") { // TODO check if standup in progress then not dave
      plainToClassFromExist(formData, req.body);

      const errors = await validate(formData)

      if (errors.length === 0 && false) {

        const timezone = timezones.filter((t: any) => t.id.toString() === formData.timezone).pop() as Timezone;
        if (timezone) {
          channel.timezone = timezone;
        }

        channel.duration = formData.duration
        await channelRepository.save(context.channel)

        res.redirect('/settings');
        return;
        //await this.connection.getCustomRepository(QuestionRepository).updateForChannel(formData.questions, context.channel)
      } else {
        viewErrors = transformViewErrors(errors)
      }
    } else {
      plainToClassFromExist(formData, channel);
      formData.timezone = channel.timezone.id;
    }

    const weekDays = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ];

    console.log(viewErrors)

    res.send(this.render('settings', {
      timezones,
      activeMenu: 'settings',
      weekDays,
      formData,
      errors: viewErrors
    }))
  }
}
