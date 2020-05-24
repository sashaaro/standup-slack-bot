import StandUp, {isInProgress} from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection, Repository} from "typeorm";
import {RENDER_TOKEN} from "../../services/token";
import {AccessDenyError, ResourceNotFoundError} from "../dashboardExpressMiddleware";
import SlackWorkspace from "../../model/SlackWorkspace";
import User from "../../model/User";
import {RenderFn} from "../../services/providers";
import {IHttpAction} from "./index";
import Timezone from "../../model/Timezone";
import {Expose, plainToClassFromExist, Transform, Type} from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt, IsMilitaryTime,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  validate, ValidateNested, ValidationError
} from "class-validator";
import Question from "../../model/Question";
import {Team} from "../../model/Team";

const replaceAll = function(string, search, replace){
  return string.split(search).join(replace);
}

export const linkExpr = '(https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9]+\\.[^\\s]{2,}|www\\.[a-zA-Z0-9]+\\.[^\\s]{2,})'


const transformStringToInt = (v) => v ? parseInt(v) || null : null

class QuestionOptionsFormDTO {
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
  @Type(() => QuestionOptionsFormDTO)
  @Transform(v => v || [])
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
  receivers: string[]

  constructor() {
    this.receivers = [];
  }

}

export const transformViewErrors = (errors: ValidationError[], err?: any[]) => {
  err = err || []
  errors.forEach(error => {
    err[error.property] = error.constraints ? Object.values(error.constraints) : []
    transformViewErrors(error.children, err[error.property])
  })
  return err;
}

// https://api.slack.com/docs/message-formatting
const formatMsg = async (team: SlackWorkspace, userRepository: Repository<User>, text) => {
  //text = text.replace(new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  //text = replaceAll(text, new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  let newText = text
  // channel link
  do {
    text = newText
    newText = text.replace(new RegExp('<#([A-Z0-9]+)\\|([#a-zA-Z0-9\-]+)>'),
      `<a target="_blank" href="https://${team.domain}.slack.com/messages/$1/details/">#$2</a>`
    )
  } while (newText !== text)

  do {
    text = newText
    const match = text.match(new RegExp('<@([A-Z0-9]+)>'))

    if (!match || match.length === 0) {
      break;
    }
    const user = await userRepository.findOne(match[1])
    if (user) {
      newText = text.substring(0, match.index) + text.slice(match.index).replace(`<@${match[1]}>`,
        `<a target="_blank" href="https://${domain}.slack.com/messages/${match[1]}/details/">@${user.name}</a>`)
    } else {
      newText = text.substring(0, match.index) + text.slice(match.index).replace(`<@${match[1]}>`, `<.@${match[1]}>`)
    }

  } while (true)

  do {
    text = newText
    newText = text.replace(new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  } while (newText !== text)

  return newText;
}

@Injectable()
export class TeamAction {
  constructor(
    private connection: Connection,
    @Inject(RENDER_TOKEN) private render: RenderFn
  ) {

  }

  create: IHttpAction = async (req, res) => {
    const timezones = await this.connection.getRepository(Timezone).find();

    const teamRepository = this.connection.getRepository(Team)
    const formData = new TeamFormDTO();
    let viewErrors = {}

    if (req.method === "POST") { // TODO check if standup in progress then not dave
      plainToClassFromExist(formData, req.body);
      console.log(formData);

      const errors = await validate(formData)

      if (errors.length === 0) {
        let team = new Team()
        team.timezone = await this.connection.getRepository(Timezone).findOne(formData.timezone) || team.timezone;
        team.name = formData.name
        team.start = formData.start
        team.duration = formData.duration
        team.questions = formData.questions.map(q => this.connection.getRepository(Question).create(q as object))
        team.questions.map((q, index) => q.index = index);

        team = await teamRepository.save(team)

        res.redirect(`/team/${team.id}/edit`);
        return;
        //await this.connection.getCustomRepository(QuestionRepository).updateForChannel(formData.questions, context.channel)
      } else {
        viewErrors = transformViewErrors(errors)
      }
    }

    req.context.user.workspace = await this.connection.getRepository(SlackWorkspace).findOneOrFail(
      req.context.user.workspace.id, { relations: ['users']}
    )

    const users = req.context.user.workspace.users

    res.send(this.render('settings', {
      timezones,
      activeMenu: 'settings',
      weekDays: weekDays,
      formData,
      users,
      errors: viewErrors
    }))
  }

  edit: IHttpAction = async (req, res) => {
    const teamRepository = this.connection.getRepository(Team)

    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = req.params.id

    const team = await teamRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'timezone')
      .leftJoinAndSelect('t.questions', 'questions')
      .leftJoinAndSelect('t.users', 'users')
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
    const formData = new TeamFormDTO();


    let viewErrors: any = {};

    if (req.method === "POST") { // TODO check if standup in progress then not dave
      plainToClassFromExist(formData, req.body);
      console.log(formData);

      const errors = await validate(formData)

      if (errors.length === 0) {
        team.timezone = await this.connection.getRepository(Timezone).findOne(formData.timezone) || team.timezone;
        team.name = formData.name
        team.start = formData.start
        team.duration = formData.duration
        team.questions = formData.questions.map(q => this.connection.getRepository(Question).create(q as object))
        //console.log(formData.receivers)
        team.users = formData.receivers.map(r => this.connection.getRepository(User).create({id: r}))
        team.questions.map((q, index) => q.index = index);

        await teamRepository.save(team)

        // todo notify
        res.redirect(`/team/${team.id}/edit`);
        return;
        //await this.connection.getCustomRepository(QuestionRepository).updateForChannel(formData.questions, context.channel)
      } else {
        viewErrors = transformViewErrors(errors)
      }
    } else {
      plainToClassFromExist(formData, team);
      formData.timezone = team.timezone.id; // TODO
      formData.receivers = team.users.map(u => u.id);
      //formData.questions = channel.questions.map(q => Object.assign(new QuestionFormDTO(), q))
    }

    console.log(viewErrors)
    console.log(viewErrors.questions)

    req.context.user.workspace = await this.connection.getRepository(SlackWorkspace).findOneOrFail(
      req.context.user.workspace.id, { relations: ['users']}
    )

    const users = req.context.user.workspace.users

    res.send(this.render('settings', {
      timezones,
      activeMenu: 'settings',
      weekDays,
      formData,
      users,
      errors: viewErrors
    }))
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

    res.send(this.render('standUps', {
      //standUpList,
      standUps,
      activeMenu: 'reports',
      pageCount
    }));
  }
}
