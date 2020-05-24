import {Connection} from "typeorm";
import {Channel} from "../model/Channel";
import {Injectable} from 'injection-js';
import User from "../model/User";

export interface IAuthUser {
  "id": "U1234",
  "scope": "chat:write",
  "access_token": "xoxp-1234",
  "token_type": "user"
}

@Injectable()
export default class DashboardContext {
  public user: User;

  constructor(
    private session: Express.Session,
    private connection: Connection
  ) {}

  async init() {
    const authedUser = this.session.user as IAuthUser;
    const userRepository = this.connection.getRepository(User);
    //this.user = await userRepository.findOne('UJZM51SN8');
    //this.session.channel = 'CK222FUKH'
    if (authedUser) {
      this.user = await userRepository.findOne(authedUser.id);
    }
    this.user = await userRepository.findOne(null);
  }

  authenticate(authedUser: IAuthUser, user: User) {
    this.session.user = authedUser // TODO save id only
    this.user = user;
  }
}
