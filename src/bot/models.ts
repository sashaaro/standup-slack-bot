import {Observable} from "rxjs";
import AnswerRequest from "../model/AnswerRequest";

export interface ITimezone {
  label: string,
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

  start: Date;
  end: Date;
  answers: IAnswerRequest[];
}

export interface IStandUpProvider {
  agreeToStart$: Observable<IUser>

  sendGreetingMessage?(user: IUser, standUp: IStandUp);

  // TODO startTeamStandUpByDate(): Promise<IStandUp[]>
  createStandUp(): IStandUp

  insertStandUp(standUp: IStandUp): Promise<any>

  createAnswer(): IAnswerRequest

  insertAnswer(answer: IAnswerRequest): Promise<any>

  updateAnswer(answer: IAnswerRequest): Promise<AnswerRequest>

  findTeamsByStartNow(): Promise<ITeam[]>

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