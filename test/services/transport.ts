import {IMessage, IStandUp, ITransport, IUser} from "../../src/bot/models";
import {Subject} from "rxjs";

export class TestTransport implements ITransport {
  agreeToStart$ = new Subject<IUser>();
  message$ = new Subject<IMessage>();
  messages$ = new Subject<IMessage[]>();

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
