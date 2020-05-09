import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN} from "../../services/token";
import Timezone from "../../model/Timezone";
import DashboardContext from "../../services/DashboardContext";
import {AccessDenyError, ResourceNotFoundError} from "../dashboardExpressMiddleware";
import {Expose, plainToClassFromExist, Transform, Type} from "class-transformer";
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
  IsMilitaryTime, IsArray, IsString, IsBoolean,
} from "class-validator";
import Question from "../../model/Question";
import {Team} from "../../model/Team";

const transformStringToInt = (v) => v ? parseInt(v) || null : null

class PredefinedAnswerFormDTO {
  @Transform(transformStringToInt)
  id: number
  @IsNotEmpty()
  @IsString()
  text: string
  @IsBoolean()
  isSame: string
}
class QuestionFormDTO {
  constructor() {
    this.options = []
  }
  @Transform(transformStringToInt)
  id: number
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  text: string
  @Expose()
  @Type(() => PredefinedAnswerFormDTO)
  @Transform(v => v || [])
  @IsArray()
  //@Min(2, {})
  options: PredefinedAnswerFormDTO[]
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
  @Max(59, {message: 'must not be greater than 59'})
  duration: number
  @Expose()
  @Type(() => QuestionFormDTO)
  @IsNotEmpty()
  @ValidateNested()
  questions: QuestionFormDTO[]
  @IsNotEmpty()
  @IsMilitaryTime({message: 'must be a valid in the format HH:MM'})
  start: string
}

const transformViewErrors = (errors: ValidationError[], err?: any[]) => {
  err = err || []
  errors.forEach(error => {
    err[error.property] = error.constraints ? Object.values(error.constraints) : []
    transformViewErrors(error.children, err[error.property])
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
    const teamRepository = this.connection.getRepository(Team)

    if (!context.user) {
      throw new AccessDenyError();
    }

    const id = req.params.id

    const team = await teamRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'timezone')
      .leftJoinAndSelect('t.questions', 'questions')
      .leftJoinAndSelect('questions.options', 'options')
      .where({id: id})
      // .andWhere('ch.isArchived = false')
      // .andWhere('ch.isEnabled = true')
      .orderBy("questions.index", "ASC")
      .getOne();

    if (!team) {
      throw new ResourceNotFoundError('Team is not found');
    }

    const timezones = await this.connection.getRepository(Timezone).find();
    const formData = new SettingsFormDTO();


    let viewErrors = {};

    if (req.method === "POST") { // TODO check if standup in progress then not dave
      plainToClassFromExist(formData, req.body);
      console.log(formData);

      const errors = await validate(formData)

      if (errors.length === 0) {
        team.timezone = await this.connection.getRepository(Timezone).findOne(formData.timezone) || team.timezone;
        team.start = formData.start
        team.duration = formData.duration
        team.questions = formData.questions.map(q => this.connection.getRepository(Question).create(q as object))
        team.questions.map((q, index) => q.index = index);

        await teamRepository.save(team)

        res.redirect('/settings');
        return;
        //await this.connection.getCustomRepository(QuestionRepository).updateForChannel(formData.questions, context.channel)
      } else {
        viewErrors = transformViewErrors(errors)
      }
    } else {
      plainToClassFromExist(formData, team);
      formData.timezone = team.timezone.id;
      //formData.questions = channel.questions.map(q => Object.assign(new QuestionFormDTO(), q))
    }

    const weekDays = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ];
    console.log(viewErrors)
    console.log(viewErrors.questions)

    res.send(this.render('settings', {
      timezones,
      activeMenu: 'settings',
      weekDays,
      formData,
      errors: viewErrors
    }))
  }
}
