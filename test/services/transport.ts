import {IMessage, IStandUp, ITransport, IUser} from "../../src/bot/models";
import {Subject} from "rxjs";
import {Injectable} from "injection-js";

@Injectable()
export class TestTransport implements ITransport {
  agreeToStart$ = new Subject<{user:IUser, date: Date}>();
  message$ = new Subject<IMessage>();
  batchMessages$ = new Subject<IMessage[]>();

  calls = [];

  sendGreetingMessage(user: IUser, standUp: IStandUp) {
    this.calls.push(['sendGreetingMessage', user, standUp])
  }

  sendMessage(user: IUser, message: string): Promise<any> {
    this.calls.push(['sendMessage', user, message])
    return Promise.resolve(undefined);
  }

  reset() {
    this.calls = []
  }
}
