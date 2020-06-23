import {clearDatabase, testConnection, testInjector} from "./main";
import assert from "assert";
import Timezone from "../src/model/Timezone";
import StandUpBotService from "../src/bot/StandUpBotService";
import {initFixtures} from "../src/services/providers";
import User from "../src/model/User";
import {TestTransport} from "./services/transport";
import each from 'jest-each';
import {Team} from "../src/model/Team";
import SlackWorkspace from "../src/model/SlackWorkspace";
import Question from "../src/model/Question";

beforeAll(async () => {
  await testConnection.connect();
  await testConnection.dropDatabase();
  await testConnection.runMigrations();
})
beforeEach(async () => {
  await clearDatabase();
  await initFixtures(testConnection);
})

afterEach(async () => {
  const testTransport = testInjector.get(TestTransport) as TestTransport;
  testTransport.reset()
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const generateTeam = () => {
  const team = new Team();
  team.name = 'team';
  team.isEnabled = true;
  team.duration = 20;
  return team
}

const generateWorkspace = (id: number) => {
  const workspace = new SlackWorkspace();
  workspace.name = 'test space'
  workspace.domain = 'test-space'
  workspace.id = `space-${id}`
  return workspace;
}

const createQuestion = (text: string) => {
  const q = new Question();
  q.text = text;
  return q;
}

each([
  ['2020-04-01T10:05:00', true],
  ['2020-04-01T11:05:00', false],
]).test('new channel', async (meetUpDateStart, standupInTime, done) => {
  const workspace = generateWorkspace(1);
  await testConnection.getRepository(SlackWorkspace).save(workspace);

  const user = testConnection.getRepository(User).create();
  user.id = '1';
  user.name = 'Alex';
  user.workspace = workspace;
  await testConnection.getRepository(User).save(user);

  const team = generateTeam();
  team.timezone = await testConnection.getRepository(Timezone).findOne({name : 'Europe/Moscow'});
  team.start = '13:05';
  team.reportSlackChannel = 'D8E8D0';
  team.workspace = workspace;
  team.users = [user];
  team.createdBy = user;
  team.questions = [
    createQuestion('Are you stupid?'),
    createQuestion('Are you stupid?'),
    createQuestion('Are you stupid?')
  ];
  team.questions.map((q, index) => q.index = index); // recalculate question index

  await testConnection.getRepository(Team).save(team);

  assert.strictEqual(team.questions.length, 3);
  assert.strictEqual(team.users.length, 1);

  const standUpBotService = testInjector.get(StandUpBotService) as StandUpBotService;
  standUpBotService.listenTransport();
  meetUpDateStart = new Date(meetUpDateStart);
  await standUpBotService.startDailyMeetUpByDate(meetUpDateStart)

  const testTransport = testInjector.get(TestTransport) as TestTransport;

  if (standupInTime) {
    assert.strictEqual(testTransport.calls.shift()[0], 'sendGreetingMessage', 'Greeting msg was sent');

    testTransport.agreeToStart$.next({user, date: meetUpDateStart});
    await sleep(300);
    assert.strictEqual(testTransport.calls.shift()[0], 'sendMessage');

    const msg = {
      team,
      user,
      createdAt: meetUpDateStart
    }

    testTransport.batchMessages$.next([
      {...msg, text: 'my-answer-1'},
      {...msg, text: 'my-answer-2'},
      {...msg, text: 'my-answer-3'},
    ]);

    await sleep(300);

    // console.log(testInjector.get(LOGGER_TOKEN).transport.logs);
    assert.strictEqual(testTransport.calls.length, 1);
    assert.strictEqual(testTransport.calls.shift()[0], 'sendMessage', 'Sent bay bay msg');

    testTransport.batchMessages$.next([
      {...msg, text: 'new-answer-1'},
      {...msg, text: 'new-answer-2'},
      {...msg, text: 'new-answer-3'},
    ]);

    await sleep(300);

    assert.strictEqual(testTransport.calls.length, 1);
    assert.strictEqual(testTransport.calls.shift()[0], 'sendMessage', 'Sent bay bay msg');

    testTransport.message$.next({text: 'new', createdAt: meetUpDateStart, user});
    await sleep(300);
    const msgg = testTransport.calls.shift();
    assert.strictEqual(msgg[0], 'sendMessage');
    expect(msgg[2]).toContain('already submitted')

  } else {
    assert.strictEqual(testTransport.calls.length, 0);
  }

  testTransport.reset()

  done();
})
