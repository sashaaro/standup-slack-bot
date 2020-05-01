import { Injectable, Inject, InjectionToken } from 'injection-js';
import {interval, Observable, of, Subject, timer} from "rxjs";
import {delay, filter, map, mergeMap, take, takeUntil} from "rxjs/operators";
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
  protected finishStandUp = new Subject<IStandUp>()

  finishStandUp$ = this.finishStandUp.asObservable()

  private end$ = new Subject();

  constructor(
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) protected standUpProvider: IStandUpProvider,
    @Inject(STAND_UP_BOT_TRANSPORT) protected transport: ITransport) {
  }


  init() {
    if (this.transport.agreeToStart$) {
      this.transport.agreeToStart$.subscribe(async ({user, date}) => {
        const standUp = await this.standUpProvider.findByUser(user, date);

        if (standUp) {
          await this.askFirstQuestion(user, standUp);
        } else {
          // you standup not started yet
        }
      })
    }
  }

  start() {
    this.startStandUpInterval();
    this.listenMessages();
    this.init()
  }

  private listenMessages() {
    if (this.transport.message$) {
      this.transport.message$.subscribe(async (message: IMessage) => {
        await this.answerAndSendNext(message)
      })
    }
    if (this.transport.messages$) { // receive batch of messages
      this.transport.messages$.subscribe(async (messages: IMessage[]) => {
        await this.answersAndFinish(messages)
      })
    }
  }


  async startTeamStandUpByDate(date: Date): Promise<IStandUp[]> {
    let standUps: IStandUp[] = [];
    const teams = await this.standUpProvider.findTeamsByStart(date);

    for (const team of teams) {
      const standUp = this.standUpProvider.createStandUp();
      standUp.startAt = date;
      standUp.team = team;
      standUp.endAt = new Date(standUp.startAt);
      // standUp.endAt.setSeconds(0, 0);
      standUp.endAt.setTime(standUp.endAt.getTime() + team.duration * 60 * 1000)

      await this.standUpProvider.insertStandUp(standUp);
      standUps.push(standUp);
    }

    return standUps;
  }

  async answerAndSendNext(message: IMessage): Promise<IAnswerRequest> {
    let repliedAnswer: IAnswerRequest;
    try {
      repliedAnswer = await this.answer(message);
    } catch (e) {
      if (e instanceof InProgressStandUpNotFoundError) {
        console.log(e)
        await this.send(message.user, `I will remind you when your next standup is up..`)
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

    standUp = standUp || await this.standUpProvider.findByUser(user, messages[0].createdAt);

    const now = new Date()
    for(const [i, message] of messages.entries()) {
      const question = standUp.team.questions[i]
      if (!question) {
        console.warn(`No question #${i} in standup #${standUp.id} team #${standUp.team.id}`)
        break;
      }
      // TODO try catch
      const answerRequest = this.standUpProvider.createAnswer()
      answerRequest.standUp = standUp;
      answerRequest.user = message.user
      answerRequest.question = question
      answerRequest.createdAt = now;

      answerRequest.answerMessage = message.text;
      answerRequest.answerCreatedAt = new Date();
      answerRequest.answerCreatedAt.setTime(now.getTime() + (i * 100) ); // for save correct order. TODO create order index question ?!
    }

    await this.afterStandUp(user, standUp);
  }

  /**
   * @throws InProgressStandUpNotFoundError
   * @throws AlreadySubmittedStandUpError
   * @param message
   */
  async answer(message: IMessage): Promise<IAnswerRequest> {
    const progressStandUp = await this.standUpProvider.findByUser(message.user, message.createdAt);

    if (!progressStandUp) {
      const error = new InProgressStandUpNotFoundError()
      error.answerMessage = message
      throw error;
    }

    const answerRequest: IAnswerRequest = await this.standUpProvider.findLastNoReplyAnswerRequest(progressStandUp, message.user);

    if (!answerRequest) {
      const error = new AlreadySubmittedStandUpError()
      error.standUp = progressStandUp
      error.answerMessage = message
      throw error
      // throw new Error(`Last no reply answerRequest is not found for standup ${standUp.id} and message ${message.text}`)
    }

    answerRequest.answerMessage = message.text;
    answerRequest.answerCreatedAt = new Date();
    return this.standUpProvider.updateAnswer(answerRequest)
  }

  private startStandUpInterval() {
    const intervalMs = 60 * 1000;  // every minutes

    const now = new Date();
    const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds();
    const millisecondsDelay = intervalMs - milliseconds;

    console.log('Wait delay ' + (millisecondsDelay / 1000).toFixed(2) + ' seconds for run loop');

    interval(intervalMs)
      .pipe(
        delay(millisecondsDelay),
        takeUntil(this.end$),
        map(_ => new Date()),
        delay(5 * 1000)  // 5 seconds delay
      ).subscribe(async (date: Date) => {
        await this.startDailyMeetUpByDate(date)
        await this.checkStandUpEndByDate(date)
      })
  }

  async startDailyMeetUpByDate(date) {
    // start ask users
    const standUps = await this.startTeamStandUpByDate(date);

    for (const standUp of standUps) {
      for (const user of standUp.team.users) {
        const canStart = await this.beforeStandUp(user, standUp);
        if (canStart) {
          await this.askFirstQuestion(user, standUp);
        }
      }
    }
  }

  async checkStandUpEndByDate(date) {
    const endedStandUps = await this.standUpProvider.findStandUpsEndNowByDate(date);
    for (const endedStandUp of endedStandUps) {
      this.finishStandUp.next(endedStandUp);
    }
  }

  private async askFirstQuestion(user: IUser, standUp: IStandUp)
  {
    const question = await this.standUpProvider.findOneQuestion(standUp.team, 0);
    if (!question) {
      console.log(`No questions in standup #${standUp.id}`);
      return;
    }
    await this.askQuestion(user, question, standUp)

  }

  /**
   * Returns observable boolean Can we start to asking
   * @param user
   * @param standUp
   */
  private async beforeStandUp(user: IUser, standUp: IStandUp): Promise<boolean> {
    if (this.transport.sendGreetingMessage) {
      await this.transport.sendGreetingMessage(user, standUp)
    } else {
      await this.send(user, standUpGreeting);
    }

    return !this.transport.agreeToStart$ // true if no agree option
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
    this.end$.next();
    this.end$.complete();
    this.end$ = new Subject()
  }

  stop() {
    this.stopInterval()
  }
}
