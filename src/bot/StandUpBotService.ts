import { Injectable, Inject, InjectionToken } from 'injection-js';
import {Observable, Subject, timer} from "rxjs";
import {delay, map, share, takeUntil} from "rxjs/operators";
import {IAnswerRequest, IMessage, IQuestion, IStandUp, IStandUpProvider, ITransport, IUser} from "./models";
import {LOGGER_TOKEN, TERMINATE} from "../services/token";
import {Logger} from "winston";
import {hasOptionQuestions} from "../slack/slack-bot-transport.service";

const standUpGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
const standUpGoodBye = 'Have good day. Good bye.';
const standUpWillRemindYouNextTime = `I will remind you when your next standup is up..`;

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

class NeedOpenDialogStandUpError extends Error {
  standUp: IStandUp
  answerMessage: IMessage

  constructor() {
    super('Standup already submitted')
  }
}

class OptionNotFoundError extends Error {
  public option: string;
  public standup: number; // TODO save
}

@Injectable()
export default class StandUpBotService {
  protected finishStandUp = new Subject<IStandUp>()
  finishStandUp$ = this.finishStandUp.asObservable()

  constructor(
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) protected standUpProvider: IStandUpProvider,
    @Inject(STAND_UP_BOT_TRANSPORT) protected transport: ITransport,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {}

  listenTransport() {
    if (this.transport.message$) {
      this.transport.message$
        //.pipe(takeUntil(this.terminate$))
        .subscribe((message: IMessage) => this.answerAndSendNext(message))
    }
    if (this.transport.batchMessages$) { // receive batch of messages
      this.transport.batchMessages$
        //.pipe(takeUntil(this.terminate$))
        .subscribe((messages: IMessage[]) => this.answers(messages))
    }

    if (this.transport.startConfirm$) {
      this.transport.startConfirm$
        //.pipe(takeUntil(this.terminate$))
        .subscribe(async ({user, date}) => {
          const standUp = await this.standUpProvider.findByUser(user, date);

          this.logger.debug('Agree start triggered', {user: user.id, date, standUpId: standUp?.id})

          if (standUp) {
            await this.askFirstQuestion(user, standUp);
          } else {
            this.logger.info("Standup is not started yet", {user: user.id, date});
            // await this.send(user, standUpWillRemindYouNextTime)
          }
        })
    }
  }

  async startTeamStandUpByDate(date: Date): Promise<IStandUp[]> {
    let standUps: IStandUp[] = [];
    const teams = await this.standUpProvider.findTeamsByStart(date);

    this.logger.debug('Start standup', {date, teams: teams.map(t => t.id)})
    for (const team of teams) {
      const standUp = this.standUpProvider.createStandUp();
      standUp.startAt = date;
      standUp.team = team;
      standUp.endAt = new Date(standUp.startAt.getTime() + team.duration * 60 * 1000);

      await this.standUpProvider.insertStandUp(standUp);
      standUps.push(standUp);
    }

    return standUps;
  }

  async answerAndSendNext(message: IMessage) {
    let repliedAnswer: IAnswerRequest;
    try {
      repliedAnswer = await this.answer(message);
    } catch (e) {
      if (e instanceof InProgressStandUpNotFoundError) {
        this.logger.info('Attempt send answer to for ended standup', {error: e});
        await this.send(message.user, standUpWillRemindYouNextTime)
        return;
      } else if (e instanceof AlreadySubmittedStandUpError) {
        await this.send(message.user, `You've already submitted your standup for today.`)
        return;
      } else if (e instanceof NeedOpenDialogStandUpError) {
        this.send(message.user, "Click \"Open dialog\" above")
        return;
      } else if (e instanceof OptionNotFoundError) {
        this.logger.error('Option is not found', {error: e});
      } else {
        this.logger.error('Error answer', {error: e});
        return;
      }
    }
    const nextQuestionIndex = repliedAnswer.question.index + 1
    const nextQuestion = repliedAnswer.standUp.team.questions[nextQuestionIndex];

    this.logger.debug('Next question: ', {
      nextQuestion,
      nextQuestionIndex,
      team: repliedAnswer.standUp.team?.id,
    });
    if (nextQuestion) {
      await this.askQuestion(repliedAnswer.user, nextQuestion, repliedAnswer.standUp);
    } else {
      await this.afterStandUp(repliedAnswer.user, repliedAnswer.standUp);
    }
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
    if (hasOptionQuestions(progressStandUp.team)) {
      throw new NeedOpenDialogStandUpError()
    }

    const answerRequest: IAnswerRequest = progressStandUp.answers.find(answerRequest => !answerRequest.answerMessage);
    if (!answerRequest) {
      const error = new AlreadySubmittedStandUpError()
      error.standUp = progressStandUp
      error.answerMessage = message
      throw error
      // throw new Error(`Last no reply answerRequest is not found for standup ${standUp.id} and message ${message.text}`)
    }

    await this.applyMessageToAnswerRequest(answerRequest, message.text);
    answerRequest.answerCreatedAt = message.createdAt;
    return await this.standUpProvider.saveAnswer(answerRequest)
  }

  /**
   * @param answer
   * @param message
   * @throws OptionNotFoundError
   */
  async applyMessageToAnswerRequest(answer: IAnswerRequest, message: string) {
    if (!answer.question) {
      const error = new OptionNotFoundError('Option is undefined!')
      error.option = message;
      throw error
    }
    if (answer.question.options.length) {
      const optionId = parseInt(message);
      if (optionId === NaN) {
        const error = new OptionNotFoundError('Wrong response option')
        error.option = message;
        throw error;
      }
      answer.option = await this.standUpProvider.findOption(optionId);
      if (!answer.option) {
        const error = new OptionNotFoundError('Option not found')
        error.option = message;
        throw error;
      }
    } else {
      answer.answerMessage = message;
    }
  }

  /**
   * @param messages
   * @throws OptionNotFoundError
   */
  async answers(messages: IMessage[]): Promise<IAnswerRequest[]> {
    if (messages.length === 0) {
      throw new Error('Invalid argument messages is empty array')
    }

    /*if (!answerRequest) {
      const error = new AlreadySubmittedStandUpError()
      error.standUp = progressStandUp
      error.answerMessage = message
      throw error
    }*/

    const user = messages[0].user;
    const messageDate = messages[0].createdAt;
    const standUp = await this.standUpProvider.findByUser(user, messageDate);

    if (!standUp) {
      throw new InProgressStandUpNotFoundError()
    }

    if (standUp.answers.length !== 0) {
      if (standUp.answers.filter(a => a.user.id !== user.id).length > 0) {
        throw new Error('Standup should contains current user answers only');
      }
    }

    if (standUp.team.questions.length === 0) {
      throw new Error('Team have not any questions');
    }

    if (standUp.team.questions.length !== messages.length) {
      this.logger.warn('Messages count is not equal questions one')
    }

    for(const [i, message] of messages.entries()) {
      const question = standUp.team.questions[i]
      if (!question) {
        this.logger.warn(`No question #${i} in standup #${standUp.id} team #${standUp.team.id}`);
        break;
      }
      // TODO try catch

      let answer = standUp.answers[question.index];

      if (!answer) {
        answer = this.standUpProvider.createAnswer()
        answer.standUp = standUp;
        answer.user = message.user;
        answer.createdAt = messageDate;
        standUp.answers[question.index] = answer;
      }
      answer.question = question;
      await this.applyMessageToAnswerRequest(answer, message.text);

      answer.answerCreatedAt = messageDate;
      answer.answerCreatedAt.setTime(messageDate.getTime() + (i * 100) ); // for save correct order. TODO create order index question ?!
    }

    const answers = await this.standUpProvider.saveUserAnswers(standUp, standUp.answers)
    // todo standUp.answers

    await this.afterStandUp(user, standUp);

    return answers;
  }

  startStandUpInterval(): Observable<Date> {
    const intervalMs = 60 * 1000;  // every minutes

    const now = new Date();
    const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds();
    const millisecondsDelay = intervalMs - milliseconds;

    this.logger.debug('Wait delay ' + (millisecondsDelay / 1000).toFixed(2) + ' seconds for run loop');

    const interval$ = timer(0, intervalMs)
      .pipe(
        takeUntil(this.terminate$),
        map(_ => new Date()),
        delay(5 * 1000),
        share()
      )

    interval$.subscribe((date: Date) => {
      this.startDailyMeetUpByDate(date)
      this.checkStandUpEndByDate(date)
    })

    interval$.subscribe({
      error: (e) => this.logger.error('Standup interval error', {error: e})
    })

    return interval$
  }

  async startDailyMeetUpByDate(date: Date) {
    // start ask users
    const standUps = await this.startTeamStandUpByDate(date);

    this.logger.info('Start daily meetings', {standUps: standUps.map(standUp => standUp.id)})

    for (const standUp of standUps) {
      for (const user of standUp.team.users) {
        try {
          await this.beforeStandUp(user, standUp);
          const haveStartConfirm = this.transport.startConfirm$; // true if no agree option
          if (!haveStartConfirm) {
            await this.askFirstQuestion(user, standUp);
          }
        } catch (e) {
          this.logger.error('Start daily meeting error', {standUpId: standUp.id, userId: user.id, error: e})
        }
      }
    }
  }

  async checkStandUpEndByDate(date: Date) {
    const endedStandUps = await this.standUpProvider.findStandUpsEndNowByDate(date);
    for (const endedStandUp of endedStandUps) {
      this.finishStandUp.next(endedStandUp);
    }
  }

  private async askFirstQuestion(user: IUser, standUp: IStandUp)
  {
    const question = await standUp.team.questions[0];
    if (question) {
      await this.askQuestion(user, question, standUp)
    } else {
      this.logger.warn(`No questions in standup #${standUp.id}`)
    }
  }

  /**
   * @param user
   * @param standUp
   */
  private async beforeStandUp(user: IUser, standUp: IStandUp) {
    if (this.transport.sendGreetingMessage) {
      await this.transport.sendGreetingMessage(user, standUp)
    } else {
      await this.send(user, standUpGreeting);
    }
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
    await this.standUpProvider.saveAnswer(answer);

    return answer
  }

  async send(user: IUser, text: string): Promise<void> {
    this.logger.info(`Standup bot send to #${user.id}: "${text}"`);
    return await this.transport.sendMessage(user, text)
  }
}
