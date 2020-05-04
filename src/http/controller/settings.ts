import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN} from "../../services/token";
import {Channel} from "../../model/Channel";
import Timezone from "../../model/Timezone";
import DashboardContext from "../../services/DashboardContext";
import {AccessDenyError, ResourceNotFoundError} from "../dashboardExpressMiddleware";
import {plainToClassFromExist, Transform, Type} from "class-transformer";
import {
  ValidateNested,
  IsNotEmpty,
  validate,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  ValidationError,
  IsMilitaryTime,
} from "class-validator";
import Question from "../../model/Question";

const transformStringToInt = (v) => v ? parseInt(v) || null : null

class QuestionFormDTO {
  @Transform(transformStringToInt)
  id: number
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  text: string
}

class SettingsFormDTO {
  @IsNotEmpty()
  @Transform(transformStringToInt)
  @IsInt()
  timezone: number
  @Transform(transformStringToInt)
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
  @IsMilitaryTime({message: 'must be a valid in the format HH:MM'})
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

    const timezones = await this.connection.getRepository(Timezone).find();
    const formData = new SettingsFormDTO();


    let viewErrors = {};
    const channel = context.channel

    if (req.method === "POST") { // TODO check if standup in progress then not dave
      plainToClassFromExist(formData, req.body);

      const errors = await validate(formData)

      if (errors.length === 0) {
        channel.timezone = await this.connection.getRepository(Timezone).findOne(formData.timezone) || channel.timezone;
        channel.start = formData.start
        channel.duration = formData.duration
        channel.questions = formData.questions.map(q => this.connection.manager.create(Question, q))
        channel.questions.map((q, index) => q.index = index);

        await channelRepository.save(channel)

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

    res.send(this.render('settings', {
      timezones,
      activeMenu: 'settings',
      weekDays,
      formData,
      errors: viewErrors
    }))
  }
}
