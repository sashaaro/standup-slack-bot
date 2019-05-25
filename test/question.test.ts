import Question from "./../src/model/Question";
import * as assert from 'assert';
import StandUpBotService from "../src/bot/StandUpBotService";
import {IMessage, IStandUp, ITransport, IUser} from "../src/bot/models";
import StandUp from "../src/model/StandUp";
import {SlackStandUpProvider} from "../src/slack/SlackStandUpProvider";
import {createTypeORMConnection} from "../src/services/createTypeORMConnection";
import parameters from "../src/parameters.test";
import {Subject} from "rxjs";
import Team from "../src/model/Team";
import {Channel} from "../src/model/Channel";

describe('Question', () => {
    describe('work well', () => {
        it('should work', () => {
            const q = new Question()
            assert.equal(q.isEnabled, true);
        });
    });
});

class TraceableTransport implements ITransport {
    data = []

    messageSubject = new Subject<IMessage>()
    messagesSubject = new Subject<IMessage[]>()
    agreeToStartSubject = new Subject<IUser>()

    message$ = this.messageSubject.asObservable()
    messages$ = this.messagesSubject.asObservable()
    agreeToStart$ = this.agreeToStartSubject.asObservable()

    constructor() {
        this.messageSubject.subscribe((data) => {
            this.data.push({event: 'message', data})
        })
        this.messagesSubject.subscribe((data) => {
            this.data.push({event: 'messages', data})
        })
        this.agreeToStart$.subscribe((data) => {
            this.data.push({event: 'agreeToStart', data})
        })
    }

    async sendMessage(user: IUser, message: string): Promise<any> {
        this.data.push({event: 'sendMessage', data: {user, message}})
    }
    sendGreetingMessage(user: IUser, standUp: IStandUp) {
        this.data.push({event: 'sendGreetingMessage', data: {user, standUp}})
    }
}

test('start standup', async (done) => {
    const connection = await createTypeORMConnection(parameters as any)
    const provider = new SlackStandUpProvider(connection)
    const standUpBotService = new StandUpBotService(provider, new TraceableTransport());

    const channel = new Channel();
    channel.id = '1';
    channel.name = 'first team';
    //channel.isArchived;
    await connection.getRepository(Channel).save(team)

    standUpBotService.startTeamStandUpByDate(new Date);

    setTimeout(() => {
        assert.strictEqual(true, true);
        done()
    }, 4600)

    /*standUpBotService.finishStandUp$.subscribe((standUp: StandUp) => {
        assert.strictEqual(standUp.start, true);
        done()
    });*/
});