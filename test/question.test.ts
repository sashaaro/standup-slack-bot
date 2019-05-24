import Question from "./../src/model/Question";
import * as assert from 'assert';
import StandUpBotService from "../src/bot/StandUpBotService";
import {IStandUp, ITransport, IUser} from "../src/bot/models";
import StandUp from "../src/model/StandUp";
import {SlackStandUpProvider} from "../src/slack/SlackStandUpProvider";
import {createTypeORMConnection} from "../src/services/createTypeORMConnection";
import parameters from "../src/parameters";

describe('Question', () => {
    describe('work well', () => {
        it('should work', () => {
            const q = new Question()
            assert.equal(q.isEnabled, true);
        });
    });
});

const traceTransport: ITransport = {
    message$: undefined,
    messages$: undefined,
    agreeToStart$: undefined,
    sendMessage(user: IUser, message: string): Promise<any> {
        return undefined;
    },
    sendGreetingMessage(user: IUser, standUp: IStandUp) {}
}

describe('StandUpBot', () => {
    describe('work well', () => {
        it('should work', async (done) => {
            const provider = new SlackStandUpProvider(await createTypeORMConnection({
                debug: false,
                db: {
                    database: parameters.db.database + '_test',
                    username: parameters.db.username,
                    password: parameters.db.password,
                }
            } as any))

            const standUpBotService = new StandUpBotService(provider, transport);
            standUpBotService.start()

            standUpBotService.finishStandUp$.subscribe((standUp: StandUp) => {

                assert.strictEqual(standUp.start, true);
                done()
            });
        });
    });
});