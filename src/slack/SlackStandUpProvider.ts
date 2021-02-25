import {Injectable} from 'injection-js';
import {Brackets, Connection, SelectQueryBuilder} from "typeorm";
import StandUp from "../model/StandUp";
import AnswerRequest from "../model/AnswerRequest";
import {IAnswerRequest, IStandUp, IStandUpProvider, IUser} from "../bot/models";
import {Team, TEAM_STATUS_ACTIVATED} from "../model/Team";
import QuestionOption from "../model/QuestionOption";

export const CALLBACK_PREFIX_STANDUP_INVITE = 'standup_invite'
export const CALLBACK_STANDUP_SUBMIT = 'standup-submit'

export const ACTION_START = 'start'
export const ACTION_OPEN_DIALOG = 'dialog'// TODO rename open_dialog
export const ACTION_OPEN_REPORT = 'open_report'

@Injectable()
export class SlackStandUpProvider implements IStandUpProvider {
  constructor(private connection: Connection) {}

  findTeamsByStart(startedAt: Date): Promise<Team[]> {
    const time = `${startedAt.getHours().toString(10).padStart(2, '0')}:${startedAt.getMinutes().toString(10).padStart(2, '0')}:${startedAt.getSeconds().toString(10).padStart(2, '0')}`

    const qb = this.connection.getRepository(Team).createQueryBuilder('team');

    this.qbTeamJoins(qb);

    return qb
      .innerJoinAndSelect('team.timezone', 'timezone')
      .innerJoin( 'pg_timezone_names', 'pg_timezone', 'timezone.name = pg_timezone.name')
      .where(`(team.start::time - pg_timezone.utc_offset) = :startedAt::time`)
      .andWhere('team.status = :status', {status: TEAM_STATUS_ACTIVATED})
      .setParameter('startedAt', time)
      .getMany();
  }

  createStandUp(): StandUp {
    return this.connection.manager.create(StandUp);
  }

  findOption(id: number): Promise<QuestionOption> {
    return this.connection.getRepository(QuestionOption).findOneOrFail(id);
  }

  createAnswer(): AnswerRequest {
    return this.connection.manager.create(AnswerRequest);
  }

  saveAnswer(answer: AnswerRequest): Promise<any> {
    return this.connection.getRepository(AnswerRequest).save(answer)
  }

  insertStandUp(standUp: StandUp): Promise<any> {
    const standUpRepository = this.connection.getRepository(StandUp);

    return standUpRepository.insert(standUp)
  }

  async findByUser(user: IUser, date: Date): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository.createQueryBuilder('standup');

    qb.orderBy('standup.startAt', "ASC")

    this.qbStandUpJoins(qb);
    qb.andWhere('users.id = :user', {user: user.id});
    this.qbStandUpDate(qb, date);
    this.qbActiveQuestions(qb);
    this.qbAuthorAnswers(qb, user);

    return await qb
      .take(1)
      .getOne();
  }

  // TODO move to repository
  // with channel channelUsers questions answers answerAuthor
  private qbTeamJoins(qb: SelectQueryBuilder<Team>): SelectQueryBuilder<Team> {
    return qb
      .innerJoinAndSelect('team.users', 'users') // TODO remove / reanme channelUsers
      .innerJoinAndSelect('team.questions', 'questions')
      .leftJoinAndSelect('questions.options', 'options')
  }

  private qbStandUpJoins(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
    qb.leftJoinAndSelect('standup.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answerAuthor')
      .leftJoinAndSelect('answers.question', 'answersQuestion')
      .innerJoinAndSelect('standup.team', 'team');

    return this.qbTeamJoins(qb);
  }

  public qbStandUpDate(qb: SelectQueryBuilder<StandUp>, date: Date): SelectQueryBuilder<StandUp> {
    return qb
      .andWhere(':date >= standup.startAt', {date})
      .andWhere(':date <= standup.endAt', {date});
  }

  private qbAuthorAnswers(qb: SelectQueryBuilder<StandUp>, user: IUser): SelectQueryBuilder<StandUp> {
    return qb.andWhere(
      new Brackets(qb => {
        qb.where('answerAuthor.id = :answerAuthorID', {answerAuthorID: user.id})
        qb.orWhere('answerAuthor.id IS NULL')
      })
    )
  }

  private qbActiveQuestions(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    qb.andWhere('questions.isEnabled = true');
    return qb.orderBy("questions.index", "ASC");
  }

  async saveUserAnswers(standUp: StandUp, answers: AnswerRequest[]): Promise<AnswerRequest[]> {
    return await this.connection.getRepository(AnswerRequest).save(answers);
  }

  async findStandUpsEndNowByDate(date: Date): Promise<StandUp[]> {
    return await this.connection.getRepository(StandUp).createQueryBuilder('st')
      .leftJoinAndSelect('st.team', 'team')
      .leftJoinAndSelect('team.users', 'teamUsers')
      .leftJoinAndSelect('team.questions', 'teamQuestions')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('teamQuestions.options', 'options')
      .leftJoinAndSelect('answers.user', 'user')
      .leftJoinAndSelect('answers.question', 'question')
      .leftJoinAndSelect('answers.option', 'answersOption')
      .limit(6)
      //.where('date_trunc(\'minute\', st.endAt) = date_trunc(\'minute\', CURRENT_TIMESTAMP)')
      .andWhere('team.status = :status', {status: TEAM_STATUS_ACTIVATED})
      .addOrderBy("st.endAt", "DESC")
      .addOrderBy("question.index", "ASC")
      .getMany()
  }

  async standUpByIdAndUser(user: IUser, standUpId: any): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository.createQueryBuilder('standup');

    this.qbStandUpJoins(qb)

    qb.andWhere('users.id = :user AND standup.id = :standupID', {user: user.id, standupID: standUpId})
    this.qbActiveQuestions(qb);
    this.qbAuthorAnswers(qb, user);
    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return await qb
      .take(1)
      //.orderBy('st.start', "DESC")
      .getOne();
  }
}

