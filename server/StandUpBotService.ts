import Team from "./model/Team";
import AnswerRequest from "./model/AnswerRequest";
import {Inject, Service, Token} from "typedi";
import {Observable, of, Subject} from "rxjs";
import {filter, map, take, takeUntil} from "rxjs/operators";

const standUpGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
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
  index: number;
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
  agreeToStart$: Observable<IUser>
  sendGreetingMessage?(user: IUser);
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
  message$?: Observable<IMessage>
  messages$?: Observable<IMessage[]> // should correct order
}

export interface ITimezoneProvider {
  (): Promise<ITimezone[]>
}

export const STAND_UP_BOT_STAND_UP_PROVIDER = new Token();
export const STAND_UP_BOT_TRANSPORT = new Token();


class InProgressStandUpNotFoundError extends Error {
  answerMessage: IMessage

  constructor() {
    super('No stand up in progress')
  }
}

class AlreadySubmittedStandUpError extends Error {
  standUp: IStandUp
  answerMessage: IMessage

  constructor() {
    super('Standup already submitted')
  }
}

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

    if (this.transport.message$) {
      this.transport.message$.subscribe(async (message: IMessage) => {
        await this.answerAndSendNext(message)
      })
    }
    if (this.transport.messages$) {
      this.transport.messages$.subscribe(async (messages: IMessage[]) => {
        await this.answersAndFinish(messages)
      })
    }
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
    let repliedAnswer: IAnswerRequest;
    try {
      repliedAnswer = await this.answer(message);
    } catch (e) {
      if (e instanceof InProgressStandUpNotFoundError) {
        await this.send(message.user, `I will remind you when your next standup is up`)
      }
      if (e instanceof AlreadySubmittedStandUpError) {
        await this.send(message.user, `You've already submitted your standup for today.`)
      }

      return;
    }
    const nextQuestion = await this.standUpProvider.findOneQuestion(repliedAnswer.standUp.team, repliedAnswer.question.index + 1);

    if (!nextQuestion) {
      await this.afterStandUp(repliedAnswer.user, repliedAnswer.standUp);
      return;
    }

    return this.askQuestion(repliedAnswer.user, nextQuestion, repliedAnswer.standUp);
  }


  async answersAndFinish(messages: IMessage[]) {
    if (messages.length === 0) {
      throw new Error('Invalid argument messages is empty array')
    }

    // TODO validate every message's author should be same

    const user = messages[0].user;

    const progressStandUp = await this.standUpProvider.findProgressByUser(user);
    for(const [i, message] of messages.entries()) {
      const question = await this.standUpProvider.findOneQuestion(progressStandUp.team, i)
      if (!question) {
        throw new Error(`Question #${i} in standup #${progressStandUp.id}`)
      }
      // TODO try catch
      await this.answerByStandUp(message, progressStandUp, question)
    }

    await this.afterStandUp(user, progressStandUp);
  }

  /**
   * @throws InProgressStandUpNotFoundError
   * @throws AlreadySubmittedStandUpError
   * @param message
   */
  async answer(message: IMessage): Promise<IAnswerRequest> {
    const progressStandUp = await this.standUpProvider.findProgressByUser(message.user);

    if (!progressStandUp) {
      const error = new InProgressStandUpNotFoundError()
      error.answerMessage = message
      throw error;
    }

    return this.answerByStandUp(message, progressStandUp);
  }

  /**
   * @throws AlreadySubmittedStandUpError
   * @param message
   * @param standUp
   * @param question
   */
  private async answerByStandUp(message: IMessage, standUp: IStandUp, question?: IQuestion): Promise<IAnswerRequest> {
    let answerRequest: IAnswerRequest;
    if (!question) {
      answerRequest = await this.standUpProvider.findLastNoReplyAnswerRequest(standUp, message.user);
      
      if (!answerRequest) {
        const error = new AlreadySubmittedStandUpError()
        error.standUp = standUp
        error.answerMessage = message
        throw error
        // throw new Error(`Last no reply answerRequest is not found for standup ${standUp.id} and message ${message.text}`)
      }
    } else {
      answerRequest = this.standUpProvider.createAnswer()
      answerRequest.standUp = standUp;
      answerRequest.user = message.user
      answerRequest.question = question
      answerRequest.createdAt = new Date();
    }

    answerRequest.answerMessage = message.text;
    answerRequest.answerCreatedAt = new Date();
    return this.standUpProvider.updateAnswer(answerRequest)
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

    const canStart$ = await this.beforeStandUp(user, standUp)
    canStart$.subscribe(async (canStart) => {
      if (canStart) {
        await this.askQuestion(user, question, standUp)
      } else {
        // cancel?!
      }
    })
  }

  /**
   * Returns observable boolean Can we start to asking
   * @param user
   * @param standUp
   */
  private async beforeStandUp(user: IUser, standUp: IStandUp): Promise<Observable<boolean>> {
    if (this.standUpProvider.sendGreetingMessage) {
      await this.standUpProvider.sendGreetingMessage(user)
    } else {
      await this.send(user, standUpGreeting);
    }

    if (!this.standUpProvider.agreeToStart$) {
      return of(true);
    }

    return Observable.create((observer) => {
      this.standUpProvider.agreeToStart$.pipe(
          filter((u) => u.id === user.id),
          take(1)
          //TODO takeUntil(standUp.end)
        ).subscribe((u) => {
          observer.next(true)
          observer.complete();
      });
    })
  }

  private async afterStandUp(user: IUser, standUp: IStandUp) {
    await this.send(user, standUpGoodBye);
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
