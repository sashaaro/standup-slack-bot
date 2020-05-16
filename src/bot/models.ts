import {Observable} from "rxjs";

export interface ITimezone {
  name: string,
  utc_offset: any,
}

export interface ITeam {
  id: string | number;
  users: IUser[]
  questions: IQuestion[];
  timezone: ITimezone
  start: string
  duration: number
}

export interface IUser {
  id: string | number
  name: string
  teams: ITeam[]
}

export interface IQuestionOption {
  id: number
}
export interface IQuestion {
  id: string | number
  index: number
  text: string
  //isEnabled: boolean;
  createdAt: Date
  team: ITeam
  options: IQuestionOption[]
}

export interface IMessage {
  user: IUser
  text: string
  createdAt: Date
}

export interface IAnswerRequest {
  id: string | number | any
  user: IUser
  standUp: IStandUp
  question: IQuestion
  option: IQuestionOption
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
  saveAnswer(answer: IAnswerRequest): Promise<any>
  saveUserAnswers(standUp: IStandUp, answers: IAnswerRequest[]): Promise<IAnswerRequest[]>

  findTeamsByStart(startedAt: Date): Promise<ITeam[]>
  findByUser(user: IUser, date: Date): Promise<IStandUp>
  findOption(id: number): Promise<IQuestionOption>
  findStandUpsEndNowByDate(date: Date): Promise<IStandUp[]>
}

export interface ITransport {
  sendGreetingMessage?(user: IUser, standUp: IStandUp);
  sendMessage(user: IUser, message: string): Promise<any>

  agreeToStart$: Observable<{user: IUser, date: Date}>
  message$?: Observable<IMessage>
  batchMessages$?: Observable<IMessage[]> // should correct order
}
