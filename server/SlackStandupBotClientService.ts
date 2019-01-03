import * as slackClient from '@slack/client'
import {
  Connection,
} from "typeorm";
import Team from "./model/Team";
import {RTMAuthenticatedResponse, SlackIm} from "./slack/model/rtm/RTMAuthenticatedResponse";
import {SlackMember} from "./slack/model/SlackUser";
import User from "./model/User";
import Question from "./model/Question";
import {RTMMessageResponse} from "./slack/model/rtm/RTMMessageResponse";
import Answer from "./model/Answer";
import StandUp from "./model/StandUp";
import {Inject, Service, Token} from "typedi";
import {Observable} from "rxjs";


const standUpGreeting = 'Good morning/evening. Welcome to daily standup';
const standUpGoodBye = 'Have good day. Good bye.';


export interface ITimezone {
  name: 'Pacific/Kosrae',
  abbrev: '+11',
  utc_offset: { hours: 11 },
  is_dst?: false
}

export interface ITeamSettings {
  timezone: string
  start: string
  end: string
}

export interface ITransport {
  sendMessage(user: IUser, message: string): Promise<any>

  message$: Observable<IMessage>
}


export interface IUser {
  id: string | number
  name: string
  team: Team;
}

export interface ITeam {
  id: string | number;
  settings: ITeamSettings;
  users: IUser[]
}

export interface IQuestion {
  id: string | number;
  // index: number;
  text: string;
  //disabled: boolean;
  createdAt: Date;
  team: Team;
}

export interface IMessage {
  user: IUser,
  text: string,
  team?: ITeam
}


export interface IAnswer {
  id: string | number
  user: IUser;
  standUp: IStandUp;
  question: IQuestion
  message: string
  createdAt: Date;
}

export interface IStandUp {
  id: number | string;
  team: ITeam

  start: Date;
  end: Date;
  answers: IAnswer[];
}

export interface IStandUpProvider {
  // TODO startTeamStandUpByDate(): Promise<IStandUp[]>
  createStandUp(): IStandUp

  createAnswer(): IAnswer

  insertAnswer(answer: IAnswer): Promise<any>

  insert(standUp: IStandUp): Promise<any>

  findProgressByTeam(team: ITeam): Promise<IStandUp>

  findLastNoReplyAnswer(standUp: IStandUp, user: IUser): Promise<Answer>

  updateAnswer(answer: IAnswer): Promise<Answer>

  endedByDate(date: Date): Promise<IStandUp[]>

  getQuestion(team: ITeam, index): Promise<IQuestion>
}

export interface ITeamProvider {
  all(): Promise<Team[]>
}

export interface ITimezoneProvider {
  (): Promise<ITimezone[]>
}

@Service()
export class SlackProvider implements IStandUpProvider, ITeamProvider, ITransport {
  message$: Observable<IMessage>;

  constructor(
    private rtm: slackClient.RTMClient,
    private webClient: slackClient.WebClient,
    private connection: Connection) {
  }

  sendMessage(user: User, message: string): Promise<any> {
    return this.rtm.sendMessage(message, user.im);
  }


  init(): Promise<any> {
    const promise = new Promise(resolve => {
      const userRepository = this.connection.getRepository(User);

      this.rtm.on('connected', () => {
        console.log('Connection opened')
      });

      this.message$ = Observable.create((observer) => {
        this.rtm.on('message', async (messageResponse: RTMMessageResponse) => {
          // be sure it is direct message to bot
          if (!userRepository.findOne({where: {im: messageResponse.channel}})) {
            console.log(`User channel ${messageResponse.channel} is not im`);

            // TODO try update from api
            return
          }

          const message = {
            team: await this.connection.getRepository(Team).findOne(messageResponse.team),
            text: messageResponse.text,
            user: await this.connection.getRepository(User).findOne(messageResponse.user)
          } as IMessage;

          observer.next(message)
        })


        this.rtm.on('error', async (message) => {
          console.log(message)
          observer.complete();
        });
      });

      this.rtm.on('authenticated', async (rtmStartData: RTMAuthenticatedResponse) => {
        console.log(`Authenticated to team "${rtmStartData.team.name}"`);
        console.log(rtmStartData);

        const teamRepository = this.connection.getRepository(Team);
        let teamModel = await teamRepository.findOne(rtmStartData.team.id);
        if (!teamModel) {
          teamModel = new Team();
          teamModel.id = rtmStartData.team.id
        }

        await teamRepository.save(teamModel);

        const usersResult = await this.webClient.users.list();

        if (!usersResult.ok) {
          // throw..
          return;
        }

        const ims = <SlackIm[]>(await this.webClient.im.list() as any).ims;
        const members = <SlackMember[]>(usersResult as any).members;


        const users: User[] = [];
        for (const member of members.filter(u => !u.is_bot && !u.deleted)) {
          let user = await userRepository.findOne(member.id);
          if (!user) {
            user = new User();
            user.id = member.id
          }
          user.name = member.name;
          user.profile = member.profile;
          user.team = await teamRepository.findOne(member.team_id);

          const im = ims.filter(im => (im.user === user.id && !im.is_user_deleted)).pop();

          if (!im) {
            console.log('im not found');
            continue;
          }

          user.im = im.id;

          await userRepository.save(user)
        }

        resolve()
      })
    });

    this.rtm.start();

    return promise;
  }

  all(): Promise<Team[]> {
    return this.connection.getRepository(Team)
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.users', 'users')
      .getMany();
  }

  createStandUp(): StandUp {
    return new StandUp();
  }

  createAnswer(): Answer {
    return new Answer();
  }

  insertAnswer(answer: Answer): Promise<any> {
    return this.connection.getRepository(Answer).insert(answer)
  }

  insert(standUp: StandUp): Promise<any> {
    const standUpRepository = this.connection.getRepository(StandUp);

    return standUpRepository.insert(standUp)
  }

  async findProgressByTeam(team: ITeam): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    return await standUpRepository.createQueryBuilder('st')
      .where('st.team = :team', {team: team.id})
      // .andWhere('st.end IS NULL')
      .orderBy('st.start', "DESC")
      .getOne();
  }

  async findLastNoReplyAnswer(standUp: StandUp, user: User): Promise<Answer> {
    const answerRepository = this.connection.getRepository(Answer);
    return await answerRepository.createQueryBuilder('a')
      .leftJoinAndSelect("a.user", "user")
      .leftJoinAndSelect("a.question", "question")
      .innerJoinAndSelect("a.standUp", "standUp")
      .where('user.id = :userID', {userID: user.id})
      .andWhere('a.message IS NULL')
      .andWhere('standUp.id = :standUp', {standUp: standUp.id})
      .getOne()
  }

  async updateAnswer(lastNoReplyAnswer: Answer): Promise<Answer> {
    const answerRepository = this.connection.getRepository(Answer);

    return answerRepository.save(lastNoReplyAnswer);
  }


  async endedByDate(date: Date): Promise<StandUp[]> {
    const standUpRepository = this.connection.getRepository(StandUp);

    //now.setSeconds(0)
    //now.setMilliseconds(0)
    return standUpRepository.createQueryBuilder('st')
      .where('TO_CHAR(st.end, \'YYYY-MM-DD HH24:MI\') = TO_CHAR(NOW()::timestamp at time zone \'Europe/Moscow\', \'YYYY-MM-DD HH24:MI\')')
      .getMany()
  }

  getQuestion(team: ITeam, index): Promise<Question> {
    return this.connection.getRepository(Question).findOne({
      where: {
        index: index,
        team: team
      }
    })
  }
}


export const STAND_UP_BOT_TEAM_PROVIDER = new Token();
export const STAND_UP_BOT_STAND_UP_PROVIDER = new Token();
export const STAND_UP_BOT_TRANSPORT = new Token();


@Service()
export default class StandupBotClientService {
  protected everyMinutesIntervalID: number | any;

  constructor(
    @Inject(STAND_UP_BOT_TEAM_PROVIDER) protected teamProvider: ITeamProvider,
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) protected standUpProvider: IStandUpProvider,
    @Inject(STAND_UP_BOT_TRANSPORT) protected transport: ITransport) {
  }


  start() {
    const now = new Date();
    const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds();
    const millisecondsDelay = 60 * 1000 - milliseconds;

    console.log('Wait delay ' + millisecondsDelay + ' milliseconds for run loop');
    //setTimeout(() => {
    console.log('StandUp interval starting');
    this.startStandUpInterval();
    //}, millisecondsDelay)

    this.transport.message$.subscribe((message: IMessage) => {
      this.answerAndSendNext(message)
    })
  }

  async startTeamStandUpByDate(date: Date): Promise<IStandUp[]> {
    let standUps: IStandUp[] = [];
    const teams = await this.teamProvider.all();

    for (const team of teams) {
      const timezone = parseFloat(team.settings.timezone);
      const timeString = this.getTimeString(date, timezone);
      const inTime = team.settings.start === timeString;

      console.log('Time', team.settings.start, timeString);

      if (inTime) {
        const standUp = this.standUpProvider.createStandUp();
        standUp.team = team;
        standUp.end = new Date();

        const [hours, minutes] = team.settings.end.split(':');
        standUp.end.setHours(parseInt(hours) + timezone);
        standUp.end.setMinutes(parseInt(minutes));

        await this.standUpProvider.insert(standUp);
        standUps.push(standUp);
      }
    }

    return standUps;
  }

  endTeamStandUpByDate(date: Date): Promise<IStandUp[]> {
    return this.standUpProvider.endedByDate(date);
  }

  private getTimeString(date: Date, timezone: number) {
    const minutes = date.getUTCMinutes();
    const hours = date.getUTCHours();
    return ('0' + (hours + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2)
  }

  async answerAndSendNext(message: IMessage): Promise<IAnswer> {
    const repliedAnswer = await this.answer(message);
    const nextQuestion = await this.standUpProvider.getQuestion(message.team, repliedAnswer.question.index + 1);

    if (!nextQuestion) {
      console.log('Next question is not found');
      await this.send(repliedAnswer.user, standUpGoodBye);
      return;
    }

    return this.askQuestion(repliedAnswer.user, nextQuestion, repliedAnswer.standUp);
  }

  async answer(message: IMessage): Promise<Answer> {
    const progressStandUp = await this.standUpProvider.findProgressByTeam(message.team);

    if (!progressStandUp) {
      console.log('no progress stand up');
      return new Promise<Answer>((resolve, reject) => {
        reject('no progress stand up')
      })
    }

    const lastNoReplyAnswer = await this.standUpProvider.findLastNoReplyAnswer(progressStandUp, message.user);

    if (!lastNoReplyAnswer) {
      console.log('lastNoReplyAnswer is not found');
      // TODO
      return new Promise((r, e) => (e('lastNoReplyAnswer is not found')))
    }

    lastNoReplyAnswer.message = message.text;
    return this.standUpProvider.updateAnswer(lastNoReplyAnswer)
  }

  standUpForNow() {
    const now = new Date();
    this.startDailyMeetUpByDate(now).then()
  }

  startStandUpInterval() {
    this.standUpForNow();
    this.everyMinutesIntervalID = setInterval(this.standUpForNow.bind(this), 60 * 1000) // every minutes
  }

  async startDailyMeetUpByDate(date) {
    // start ask users
    const standUps = await this.startTeamStandUpByDate(date);

    for (const standUp of standUps) {
      for (const user of standUp.team.users) {
        await this.startAsk(user, standUp)
      }
    }


    const endedStandUps = await this.endTeamStandUpByDate(date);
    for (const endedStandUp of endedStandUps) {

      console.log('Send stand up report')
      /*endedStandUp.end = new Date();
      await this.connection.getRepository(StandUp).save(endedStandUp)
      const reportText = 'Report ...';
      const im = await this.connection.getRepository(Im).findOne(endedStandUp.team.settings.report_channel);
      if (!im) {
          console.log('Report channel is not found')
          continue;
      }
      await this.send(im, reportText);*/
    }
  }

  async startAsk(user: IUser, standUp: IStandUp) {
    const question = await this.standUpProvider.getQuestion(user.team, 0);
    if (!question) {
      console.log('No questions');
      return;
    }
    await this.send(user, standUpGreeting);
    await this.askQuestion(user, question, standUp)
  }

  async askQuestion(user: IUser, question: IQuestion, standUp: IStandUp): Promise<IAnswer> {
    const answer = this.standUpProvider.createAnswer();

    answer.user = user;
    answer.question = question;
    answer.standUp = standUp;

    await this.send(answer.user, question.text);
    await this.standUpProvider.insertAnswer(answer);

    return answer
  }

  async send(user: IUser, text: string): Promise<void> {
    return await this.transport.sendMessage(user, text)
  }

  stopInterval() {
    clearInterval(this.everyMinutesIntervalID);
    this.everyMinutesIntervalID = null
  }

  stop() {
    this.stopInterval()
  }
}
