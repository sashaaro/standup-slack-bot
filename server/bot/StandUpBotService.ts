import { Injectable, Inject, InjectionToken } from 'injection-js';
import {Observable, of, Subject, timer} from "rxjs";
import {filter, take, takeUntil} from "rxjs/operators";
import {IAnswerRequest, IMessage, IQuestion, IStandUp, IStandUpProvider, ITeam, ITransport, IUser} from "./models";

const standUpGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
const standUpGoodBye = 'Have good day. Good bye.';


export const STAND_UP_BOT_STAND_UP_PROVIDER = new InjectionToken<IStandUpProvider>('stand_up_provider');
export const STAND_UP_BOT_TRANSPORT = new InjectionToken<ITransport>('transport');


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

@Injectable()
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

  private isMeetingTime(team: ITeam, date: Date) {
    const timezoneShift = parseFloat(team.timezone as string);
    const timeString = this.getTimeString(date, timezoneShift);
    return team.start === timeString;
  }

  async startTeamStandUpByDate(date: Date): Promise<IStandUp[]> {
    let standUps: IStandUp[] = [];
    const teams = await this.standUpProvider.findTeams(); // findByStartTime

    console.log(`startTeamStandUpByDate ${date}`);

    for (const team of teams.filter((team) => this.isMeetingTime(team, date))) {
      console.log(`Send questions to ${team.id} ${(team as any).name}`)
      const standUp = this.standUpProvider.createStandUp();
      standUp.team = team;
      standUp.end = new Date();
      standUp.end.setSeconds(0, 0);
      standUp.end.setTime(standUp.end.getTime() + team.duration * 60 * 1000)

      await this.standUpProvider.insertStandUp(standUp);
      standUps.push(standUp);
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


  async answersAndFinish(messages: IMessage[], standUp?: IStandUp) {
    if (messages.length === 0) {
      throw new Error('Invalid argument messages is empty array')
    }

    // TODO validate every message's author should be same

    const user = messages[0].user;

    standUp = standUp || await this.standUpProvider.findProgressByUser(user);

    for(const [i, message] of messages.entries()) {
      const question = standUp.team.questions[i]
      if (!question) {
        console.warn(`No question #${i} in standup #${standUp.id} team #${standUp.team.id}`)
        break;
      }
      // TODO try catch
      await this.answerByStandUp(message, standUp, question)
    }

    await this.afterStandUp(user, standUp);
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
    }, (e) => {
      console.error(e)
    })
  }

  /**
   * Returns observable boolean Can we start to asking
   * @param user
   * @param standUp
   */
  private async beforeStandUp(user: IUser, standUp: IStandUp): Promise<Observable<boolean>> {
    if (this.standUpProvider.sendGreetingMessage) {
      await this.standUpProvider.sendGreetingMessage(user, standUp)
    } else {
      await this.send(user, standUpGreeting);
    }

    if (!this.standUpProvider.agreeToStart$) {
      return of(true);
    }

    return Observable.create((observer) => {
      const now = new Date();
      const delayTime = standUp.end.getTime() - now.getTime()
      if (delayTime < 1) {
        observer.error('WTF')
        return;
      }
      if (delayTime > 1000 * 100) {
        // wtf?!
      }
      this.standUpProvider.agreeToStart$.pipe(
          filter((u) => u.id === user.id),
          take(1),
          takeUntil(timer(delayTime))
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

