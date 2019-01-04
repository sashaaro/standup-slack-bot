import Team from "./model/Team";
import Answer from "./model/Answer";
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

export interface IStandUpSettings {
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
  teams: ITeam[]
}

export interface ITeam extends IStandUpSettings{
  id: string | number;
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
  findProgressByUser(user: IUser): Promise<IStandUp>

  findLastNoReplyAnswer(standUp: IStandUp, user: IUser): Promise<Answer>

  updateAnswer(answer: IAnswer): Promise<Answer>

  endedByDate(date: Date): Promise<IStandUp[]>

  getQuestion(team: ITeam, index): Promise<IQuestion>
}

export interface ITeamProvider {
  all(): Promise<ITeam[]>
}

export interface ITimezoneProvider {
  (): Promise<ITimezone[]>
}

export const STAND_UP_BOT_TEAM_PROVIDER = new Token();
export const STAND_UP_BOT_STAND_UP_PROVIDER = new Token();
export const STAND_UP_BOT_TRANSPORT = new Token();


@Service()
export default class StandUpBotService {
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
      const timezone = parseFloat(team.timezone);
      const timeString = this.getTimeString(date, timezone);
      const inTime = team.start === timeString;

      console.log('Time', team.start, timeString);

      if (inTime) {
        const standUp = this.standUpProvider.createStandUp();
        standUp.team = team;
        standUp.end = new Date();

        const [hours, minutes] = team.end.split(':');
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
    const nextQuestion = await this.standUpProvider.getQuestion(repliedAnswer.standUp.team, repliedAnswer.question.index + 1);

    if (!nextQuestion) {
      console.log('Next question is not found');
      await this.send(repliedAnswer.user, standUpGoodBye);
      return;
    }

    return this.askQuestion(repliedAnswer.user, nextQuestion, repliedAnswer.standUp);
  }

  async answer(message: IMessage): Promise<Answer> {
    const progressStandUp = await this.standUpProvider.findProgressByUser(message.user);

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
    const question = await this.standUpProvider.getQuestion(standUp.team, 0);
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
