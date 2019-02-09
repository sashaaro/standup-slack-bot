import Team from "./model/Team";
import AnswerRequest from "./model/AnswerRequest";
import {Inject, Service, Token} from "typedi";
import {Observable, Subject} from "rxjs";

const standUpGreeting = 'Good morning/evening. Welcome to daily standup';
const standUpGoodBye = 'Have good day. Good bye.';


export interface ITimezone {
  name: 'Pacific/Kosrae',
  abbrev: '+11',
  utc_offset: { hours: 11 },
  is_dst?: false
}

export interface IStandUpSettings {
  timezone: string|number
  start: string
  duration: number
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


export interface IAnswerRequest {
  id: string | number
  user: IUser;
  standUp: IStandUp;
  question: IQuestion
  answerMessage: string
  answerCreatedAt: Date
  createdAt: Date;
}

export interface IStandUp {
  id: number | string;
  team: ITeam

  start: Date;
  end: Date;
  answers: IAnswerRequest[];
}

export interface IStandUpProvider {
  // TODO startTeamStandUpByDate(): Promise<IStandUp[]>
  createStandUp(): IStandUp
  insertStandUp(standUp: IStandUp): Promise<any>

  createAnswer(): IAnswerRequest
  insertAnswer(answer: IAnswerRequest): Promise<any>
  updateAnswer(answer: IAnswerRequest): Promise<AnswerRequest>



  findTeams(): Promise<ITeam[]>
  findProgressByTeam(team: ITeam): Promise<IStandUp>
  findProgressByUser(user: IUser): Promise<IStandUp>
  findLastNoReplyAnswerRequest(standUp: IStandUp, user: IUser): Promise<IAnswerRequest>
  findOneQuestion(team: ITeam, index): Promise<IQuestion>
  findStandUpsEndNowByDate(date: Date): Promise<IStandUp[]>
}


export interface ITransport {
  sendMessage(user: IUser, message: string): Promise<any>
  message$: Observable<IMessage>
}

export interface ITimezoneProvider {
  (): Promise<ITimezone[]>
}

export const STAND_UP_BOT_STAND_UP_PROVIDER = new Token();
export const STAND_UP_BOT_TRANSPORT = new Token();


@Service()
export default class StandUpBotService {
  protected everyMinutesIntervalID: number | any;
  protected finishStandUp = new Subject<IStandUp>()

  finishStandUp$ = this.finishStandUp.asObservable()

  constructor(
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) protected standUpProvider: IStandUpProvider,
    @Inject(STAND_UP_BOT_TRANSPORT) protected transport: ITransport) {
  }


  start() {
    const now = new Date();
    const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds();
    let millisecondsDelay = 60 * 1000 - milliseconds;
    millisecondsDelay += 5 * 1000; // 5 seconds delay

    console.log('Wait delay ' + millisecondsDelay + ' milliseconds for run loop');
    setTimeout(() => {
      console.log('StandUp interval starting');
      this.startStandUpInterval();
    }, millisecondsDelay)

    this.transport.message$.subscribe(async (message: IMessage) => {
      await this.answerAndSendNext(message)
    })
  }

  async startTeamStandUpByDate(date: Date): Promise<IStandUp[]> {
    let standUps: IStandUp[] = [];
    const teams = await this.standUpProvider.findTeams();

    for (const team of teams) {
      const timezoneShift = parseFloat(team.timezone as string);
      const timeString = this.getTimeString(date, timezoneShift);
      const inTime = team.start === timeString;

      console.log(`team.start ${team.start}, timeString ${timeString}`)

      if (inTime) {
        const standUp = this.standUpProvider.createStandUp();
        standUp.team = team;
        standUp.end = new Date();
        standUp.end.setSeconds(0, 0);
        standUp.end.setTime(standUp.end.getTime() + team.duration * 60 * 1000)

        await this.standUpProvider.insertStandUp(standUp);
        standUps.push(standUp);
      }
    }

    return standUps;
  }

  private getTimeString(date: Date, timezoneShift: number) {
    const minutes = date.getUTCMinutes();
    const hours = date.getUTCHours();
    return ('0' + (hours + parseInt(timezoneShift.toFixed(0)))).slice(-2) + ':' + ('0' + minutes).slice(-2) // TODO shift minutes
  }

  async answerAndSendNext(message: IMessage): Promise<IAnswerRequest> {
    const repliedAnswer = await this.answer(message);
    const nextQuestion = await this.standUpProvider.findOneQuestion(repliedAnswer.standUp.team, repliedAnswer.question.index + 1);

    if (!nextQuestion) {
      console.log('Next question is not found');
      await this.send(repliedAnswer.user, standUpGoodBye);
      return;
    }

    return this.askQuestion(repliedAnswer.user, nextQuestion, repliedAnswer.standUp);
  }

  async answer(message: IMessage): Promise<AnswerRequest> {
    const progressStandUp = await this.standUpProvider.findProgressByUser(message.user);

    if (!progressStandUp) {
      console.log('no progress stand up');
      return new Promise<AnswerRequest>((resolve, reject) => {
        reject('no progress stand up')
      })
    }

    const lastNoReplyAnswerRequest = await this.standUpProvider.findLastNoReplyAnswerRequest(progressStandUp, message.user);

    if (!lastNoReplyAnswerRequest) {
      console.log('LastNoReplyAnswerRequest is not found');
      // TODO
      return new Promise((r, e) => (e('lastNoReplyAnswer is not found')))
    }

    lastNoReplyAnswerRequest.answerMessage = message.text;
    lastNoReplyAnswerRequest.answerCreatedAt = new Date();
    return this.standUpProvider.updateAnswer(lastNoReplyAnswerRequest)
  }

  async standUpForNow() {
    const now = new Date();
    this.startDailyMeetUpByDate(now).then()
    this.checkStandUpEndByDate(now).then()
  }

  startStandUpInterval() {
    this.standUpForNow().then();
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
  }

  async checkStandUpEndByDate(date) {
    const endedStandUps = await this.standUpProvider.findStandUpsEndNowByDate(date);

    for (const endedStandUp of endedStandUps) {
      this.finishStandUp.next(endedStandUp);
    }
  }

  async startAsk(user: IUser, standUp: IStandUp) {
    const question = await this.standUpProvider.findOneQuestion(standUp.team, 0);
    if (!question) {
      console.log('No questions');
      return;
    }

    await this.beforeStartStandUp(user, standUp)

    await this.askQuestion(user, question, standUp)
  }

  private async beforeStartStandUp(user: IUser, standUp: IStandUp) {
    await this.send(user, standUpGreeting);
  }

  async askQuestion(user: IUser, question: IQuestion, standUp: IStandUp): Promise<IAnswerRequest> {
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
