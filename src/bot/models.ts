import {Observable} from "rxjs";
import AnswerRequest from "../model/AnswerRequest";

export interface ITimezone {
  name: string,
  utc_offset: any,
}

export interface IStandUpSettings {
  timezone: ITimezone
  start: string
  duration: number
}

export interface IUser {
  id: string | number
  name: string
  teams: ITeam[]
}

export interface ITeam extends IStandUpSettings {
  id: string | number;
  users: IUser[]
  questions: IQuestion[];
}

export interface IQuestion {
  id: string | number
  index: number
  text: string
  //isEnabled: boolean;
  createdAt: Date
  team: ITeam
}

export interface IMessage {
  user: IUser
  text: string
  team?: ITeam
  createdAt: Date
}

export interface IAnswerRequest {
  id: string | number | any
  user: IUser
  standUp: IStandUp
  question: IQuestion
  answerMessage: string
  answerCreatedAt: Date
  createdAt: Date
}

export interface IStandUp {
  id: number | string;
  team: ITeam

  startAt: Date;
  endAt: Date;
  answers: IAnswerRequest[];
}

export interface IStandUpProvider {
  // TODO startTeamStandUpByDate(): Promise<IStandUp[]>
  createStandUp(): IStandUp

  insertStandUp(standUp: IStandUp): Promise<any>

  createAnswer(): IAnswerRequest

  insertAnswer(answer: IAnswerRequest): Promise<any>

  updateAnswer(answer: IAnswerRequest): Promise<AnswerRequest>

  findTeamsByStart(startedAt: Date): Promise<ITeam[]>

  findByUser(user: IUser, date: Date): Promise<IStandUp>

  findLastNoReplyAnswerRequest(standUp: IStandUp, user: IUser): Promise<IAnswerRequest>

  findOneQuestion(team: ITeam, index): Promise<IQuestion>

  findStandUpsEndNowByDate(date: Date): Promise<IStandUp[]>
}

export interface ITransport {
  sendGreetingMessage?(user: IUser, standUp: IStandUp);
  sendMessage(user: IUser, message: string): Promise<any>

  agreeToStart$: Observable<{user: IUser, date: Date}>
  message$?: Observable<IMessage>
  messages$?: Observable<IMessage[]> // should correct order
}

export interface ITimezoneProvider {
  (): Promise<ITimezone[]>
}
