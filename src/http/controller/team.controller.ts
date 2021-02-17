import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "../apiExpressMiddleware";
import User from "../../model/User";
import {RenderFn} from "../../services/providers";
import {IHttpAction} from "./index";
import Timezone from "../../model/Timezone";
import {Expose, plainToClassFromExist, Transform, Type} from "class-transformer";
import {
  IsArray, isBoolean,
  IsBoolean,
  IsInt, IsMilitaryTime,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  validate, ValidateNested, validateSync, ValidationError
} from "class-validator";
import Question from "../../model/Question";
import {Team} from "../../model/Team";
import {Channel} from "../../model/Channel";
import {Request} from "express";
import QuestionOption from "../../model/QuestionOption";
import {TransformFnParams} from "class-transformer/types/interfaces";

const transformStringToInt = (params: TransformFnParams) => parseInt(params.value) || null

class QuestionOptionsFormDTO {
  @Transform(transformStringToInt)
  id: number
  @IsNotEmpty()
  @IsString()
  text: string
  @IsBoolean()
  isNew: boolean
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
  @Type(() => QuestionOptionsFormDTO)
  @Transform((params: TransformFnParams) => params.value || [])
  @IsArray()
    //@Min(2, {})
  options: QuestionOptionsFormDTO[]
}


export const weekDays = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
];

export class TeamFormDTO {
  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(40)
  name: string
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
  @Expose()
  @Type(() => String)
  // @Min(1)
  @IsNotEmpty()
  receivers: string[] = [];
  @IsNotEmpty()
  @Type(() => String)
  reportSlackChannel: string
}

export const transformViewErrors = (errors: ValidationError[], err?: any[]) => {
  err = err || []
  errors.forEach(error => {
    err[error.property] = error.constraints ? Object.values(error.constraints) : []
    transformViewErrors(error.children, err[error.property])
  })
  return err;
}



@Injectable()
export class TeamController {
  teamRepository = this.connection.getRepository(Team)

  constructor(
    private connection: Connection,
  ) {
  }

  private async availableChannels(req: Request): Promise<Channel[]> {
    return await this.connection.getRepository(Channel).find({
      workspace: req.context.user.workspace,
      isEnabled: true,
      isArchived: false
    });
  }

  private async availableUsers(req: Request): Promise<User[]> {
    return await this.connection.getRepository(User).find({
      workspace: req.context.user.workspace
    })
  }

  private async availableTimezones(): Promise<Timezone[]> {
    return await this.connection.getRepository(Timezone).find();
  }

  private handleSubmitRequest(req: Request, formData: TeamFormDTO, team: Team): ValidationError[]
  {
    plainToClassFromExist(formData, req.body);
    const errors = validateSync(formData);
    if (errors.length > 0) {
      return errors
    }
    team.timezone = this.connection.manager.create(Timezone, {id: formData.timezone}) || team.timezone;
    team.name = formData.name;
    team.start = formData.start;
    team.duration = formData.duration;
    team.reportSlackChannel = formData.reportSlackChannel;
    team.users = (formData.receivers || []).map(r => this.connection.manager.create(User, {id: r}));

    const questions = team.questions;
    team.questions = [];
    formData.questions.forEach(q => {
      let question;
      if (q.id) {
        question = questions.find((qu) => qu.id === q.id)
        question = {...question, ...q}
      }

      if (!question) {
        question = this.connection.manager.create(Question, {...q, team})
      }
      const options = question.options;
      question.options = []
      q.options.forEach(o => {
        let option;
        if (o.id && !o.isNew) {
          option = options.find((op) => op.id === o.id);
          option = {...option, text: o.text}
        }
        if (!option) {
          option = this.connection.manager.create(QuestionOption, {
            id: o.id,
            text: o.text,
            question
          })
        }
        if (o.isNew) {
          delete option.id;
        }
        question.options.push(option)
      })
      team.questions.push(question);
    })

    team.questions.map((q, index) => q.index = index); // recalculate question index
    return [];
  }

  list: IHttpAction = async (req, res) => {
    const teams = await this.connection.getRepository(Team).createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'tz')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.users', 'users')
      //.andWhere('t.createdBy = :craetedBy', {craetedBy: req.context.user})
      .getMany()

    res.setHeader('Content-Type', 'application/json');
    res.send(teams);
  }

  create: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const team = new Team()
    team.workspace = req.context.user.workspace;
    team.createdBy = req.context.user;

    const formData = new TeamFormDTO();
    let errors = [];
    errors = this.handleSubmitRequest(req, formData, team);
    if (errors.length === 0) {
      team.isEnabled = true;
      await this.teamRepository.save(team);
      // notification
      res.send(team);
    } else {
      res.status(400);
      res.send(errors); // TODO remove target
    }

/*    res.send({
      timezones: await this.availableTimezones(),
      users: await this.availableUsers(req),
      channels: await this.availableChannels(req),
      weekDays: weekDays,
      formData,
      errors: transformViewErrors(errors),
    })*/
  }

  edit: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = req.params.id

    const team = await this.teamRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'timezone')
      .leftJoinAndSelect('t.questions', 'questions')
      .leftJoinAndSelect('t.workspace', 'workspace')
      .leftJoinAndSelect('t.users', 'users')
      .leftJoinAndSelect('questions.options', 'options')
      .where("t.id = :id", {id: id})
      .andWhere('t.isEnabled = :isEnabled', {isEnabled: true})
      .orderBy("questions.index", "ASC")
      .getOne();

    if (!team) {
      throw new ResourceNotFoundError('Team is not found');
    }

    if (req.context.user.workspace.id !== team.workspace.id) {
      throw new ResourceNotFoundError('Team is not found');
    }

    const formData = new TeamFormDTO();
    let errors = [];
    if (req.method === "POST") { // TODO check if standup in progress then not dave
      errors = this.handleSubmitRequest(req, formData, team);
      if (errors.length === 0) {
        await this.teamRepository.save(team);
        // TODO notification save
        res.redirect(`/team/${team.id}/edit`);
        return;
      }

      formData.receivers = formData.receivers || []
    } else {
      plainToClassFromExist(formData, team);
      formData.timezone = team.timezone.id; // TODO
      formData.receivers = team.users.map(u => u.id);
      //formData.questions = channel.questions.map(q => Object.assign(new QuestionFormDTO(), q))
    }

    res.send({
      timezones: await this.availableTimezones(),
      users: await this.availableUsers(req),
      channels: await this.availableChannels(req),
      weekDays,
      activeMenu: 'settings',
      formData,
      errors: transformViewErrors(errors),
    })
  }

  putIsEnabled: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = parseInt(req.params.id)
    if (!(id && isBoolean(req.body.isEnabled))) {
      throw new BadRequestError();
    }

    await this.teamRepository.update({id: id}, {isEnabled: req.body.isEnabled})

    res.sendStatus(204);
  }

  standups: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = req.params.id


    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.team', 'team')
      .leftJoinAndSelect('team.users', 'user')
      .leftJoinAndSelect('user.answers', 'userAnswer')
      .leftJoinAndSelect('userAnswer.question', 'answersQuestion')
      .leftJoinAndSelect('userAnswer.option', 'answersOption')
      .leftJoinAndSelect('answersQuestion.options', 'questionOptions')
      .orderBy('st.endAt', 'DESC')
      .andWhere('st.endAt IS NOT NULL')
      .andWhere('userAnswer.standUp = st.id')
      .andWhere('team.id = :teamID', {teamID: id})

    const recordsPerPage = 3
    const page = parseInt(req.query.page as string) || 1;

    const standUpsTotal = await qb.getCount();

    const standUps = await qb
      .skip((page - 1) * recordsPerPage) // use offset method?!
      .take(recordsPerPage) // use limit method?!
      .getMany();


    /*const standUpList = [];
    for (let standUp of standUps) {
      const userAnswers = [];
      for (const u of standUp.team.users) {
        for (const answer of standUp.answers as any) {
          if (answer.answerMessage) {
            answer.formatAnswerMessage = await formatMsg(context.user.team, userRepository, answer.answerMessage)
          }
        }

        userAnswers.push({
          user: u,
          answers: standUp.answers.filter(ans => ans.user.id === u.id)
        })
      }

      standUpList.push({
        standUp: standUp,
        answers: userAnswers,
        isInProgress: isInProgress(standUp)
      })
    }*/

    const pageCount = Math.ceil(standUpsTotal / recordsPerPage)

    res.send({
      //standUpList,
      standUps,
      activeMenu: 'reports',
      pageCount
    });
  }

  stats: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    res.send({})
  }
}
