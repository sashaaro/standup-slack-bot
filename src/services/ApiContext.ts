import {Injectable} from 'injection-js';
import {User} from "../entity/user";
import {em} from "./providers";

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
  ) {}

  async init() {
    const authedUser = this.session.user as IAuthUser;
    if (authedUser) {
      this.user = await em()
          .createQueryBuilder(User, 'u')
          .select('*')
          .where( {id: authedUser.id})
          .leftJoinAndSelect('u.workspace', 'w')
          .getSingleResult();
    }
  }

  authenticate(authedUser: IAuthUser, user: User) {
    this.session.user = authedUser; // TODO save id only
    this.user = user;
  }
}
