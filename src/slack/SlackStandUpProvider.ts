import {Injectable} from 'injection-js';
import {Brackets, Connection, SelectQueryBuilder} from "typeorm";
import User from "../model/User";
import StandUp from "../model/StandUp";
import AnswerRequest from "../model/AnswerRequest";
import Question from "../model/Question";
import {Channel} from "../model/Channel";
import {IStandUpProvider, IUser} from "../bot/models";

export const CALLBACK_PREFIX_STANDUP_INVITE = 'standup_invite'
export const CALLBACK_PREFIX_SEND_STANDUP_ANSWERS = 'send_answers'

export const ACTION_START = 'start'
export const ACTION_OPEN_DIALOG = 'dialog'


export const getSyncSlackTeamKey = (teamId) => 'update-slack-' + teamId


@Injectable()
export class SlackStandUpProvider implements IStandUpProvider {
  constructor(private connection: Connection) {}

  findTeamsByStart(date): Promise<Channel[]> {
    // SELECT label,
    // to_char(CURRENT_TIMESTAMP at time zone CONCAT(to_char(- timezone.utc_offset, 'HH24:'), RPAD(abs(EXTRACT(MINUTE FROM timezone.utc_offset))::text, 2, '0')), 'HH24:MI')
    // as local_time FROM timezone;

    const atTimeZone = "CONCAT(to_char(- timezone.utc_offset, 'HH24:'), RPAD(abs(EXTRACT(MINUTE FROM timezone.utc_offset))::text, 2, '0'))"; // to_char(- timezone.utc_offset, 'HH24:MI')
    const currentTimeInTimestampSql = `to_char(CURRENT_TIMESTAMP at time zone ${atTimeZone}, 'HH24:MI')`

    return this.connection.getRepository(Channel)
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.users', 'users')
      .innerJoinAndSelect('channel.timezone', 'timezone')
      .where(`channel.start = ${currentTimeInTimestampSql}`)
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
      .andWhere('channel.timezone IS NOT NULL')
      .getMany();
  }

  createStandUp(): StandUp {
    return new StandUp();
  }

  createAnswer(): AnswerRequest {
    return new AnswerRequest();
  }

  insertAnswer(answer: AnswerRequest): Promise<any> {
    return this.connection.getRepository(AnswerRequest).insert(answer)
  }

  insertStandUp(standUp: StandUp): Promise<any> {
    const standUpRepository = this.connection.getRepository(StandUp);

    return standUpRepository.insert(standUp)
  }

  async findProgressByUser(user: IUser): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository.createQueryBuilder('standup');

    qb
      .orderBy('standup.start', "ASC")

    this.qbStandUpJoins(qb)
    this.qbActualStandUpInProgressWithAuthorAnswers(qb, user);

    return qb
      .take(1)
      .getOne();
  }

  public qbActualStandUpInProgressWithAuthorAnswers(qb: SelectQueryBuilder<StandUp>, user: IUser): SelectQueryBuilder<StandUp> {
    qb.andWhere('users.id = :user', {user: user.id})
    this.qbStandUpInProgress(qb);
    this.qbActiveQuestions(qb);
    this.qbActiveChannels(qb)
    return this.qbAuthorAnswers(qb, user);
  }

  // TODO move to repository
  // with channel channelUsers questions answers answerAuthor
  private qbStandUpJoins(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    return qb.innerJoinAndSelect('standup.channel', 'channel')
      .innerJoinAndSelect('channel.users', 'users') // TODO remove / reanme channelUsers
      .innerJoinAndSelect('channel.questions', 'questions')
      .leftJoinAndSelect('standup.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answerAuthor')
  }

  public qbStandUpInProgress(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    return qb
      .andWhere('CURRENT_TIMESTAMP >= standup.start')
      .andWhere('CURRENT_TIMESTAMP <= standup.end');
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

  private qbActiveChannels(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    return qb
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
  }

  async findLastNoReplyAnswerRequest(standUp: StandUp, user: User): Promise<AnswerRequest> {
    const answerRepository = this.connection.getRepository(AnswerRequest);
    return await answerRepository.createQueryBuilder('a')
      .leftJoinAndSelect("a.user", "user")
      .leftJoinAndSelect("a.question", "question")
      .innerJoinAndSelect("a.standUp", "standUp")
      .innerJoinAndSelect("standUp.channel", "channel")
      .where('user.id = :userID', {userID: user.id})
      .andWhere('a.answerMessage IS NULL')
      .andWhere('standUp.id = :standUp', {standUp: standUp.id})
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
      .getOne()
  }

  async updateAnswer(lastNoReplyAnswer: AnswerRequest): Promise<AnswerRequest> {
    const answerRepository = this.connection.getRepository(AnswerRequest);

    return answerRepository.save(lastNoReplyAnswer);
  }

  async findStandUpsEndNowByDate(date: Date): Promise<StandUp[]> {
    return await this.connection.getRepository(StandUp).createQueryBuilder('st')
      .leftJoinAndSelect('st.channel', 'channel')
      .leftJoinAndSelect('channel.team', 'team')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'user')
      .leftJoinAndSelect('answers.question', 'question')
      .where('date_trunc(\'minute\', st.end) = date_trunc(\'minute\', CURRENT_TIMESTAMP)')
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
      .orderBy("question.index", "ASC")
      .getMany()
  }

  findOneQuestion(channel: Channel, index): Promise<Question> {
    return this.connection.getRepository(Question).findOne({
      where: {
        index: index,
        channel: channel
      }
    })
  }

  async standUpByIdAndUser(user: IUser, standUpId: any): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository.createQueryBuilder('standup');

    this.qbStandUpJoins(qb)

    qb.andWhere('users.id = :user AND standup.id = :standupID', {user: user.id, standupID: standUpId})
    this.qbActiveQuestions(qb);
    this.qbActiveChannels(qb)
    this.qbAuthorAnswers(qb, user);

    return await qb
      .take(1)
      //.orderBy('st.start', "DESC")
      .getOne();
  }
}

