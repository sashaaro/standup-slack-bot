import {Connection} from "typeorm";
import {Injectable} from 'injection-js';
import User from "../model/User";

export interface IAuthUser {
  id: string,
  scope?: string,
  access_token?: string,
  token_type?: string
}

@Injectable()
export default class ApiContext {
  public user: User;

  constructor(
    private session: any,
    private connection: Connection
  ) {}

  async init() {
    const authedUser = this.session.user as IAuthUser;
    const userRepository = this.connection.getRepository(User);
    if (authedUser) {
      this.user = await userRepository.findOne(authedUser.id, {relations: ['workspace']});
    }
  }

  authenticate(authedUser: IAuthUser, user: User) {
    this.session.user = authedUser; // TODO save id only
    this.user = user;
  }
}
