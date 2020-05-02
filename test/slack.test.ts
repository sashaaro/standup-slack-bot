import {Channel} from "../src/model/Channel";
import {clearDatabase, testConnection, testInjector} from "./main";
import {ChannelRepository} from "../src/repository/ChannelRepository";
import assert from "assert";
import Timezone from "../src/model/Timezone";
import StandUpBotService from "../src/bot/StandUpBotService";
import {initFixtures} from "../src/services/providers";
import User from "../src/model/User";
import {TestTransport} from "./services/transport";
import each from 'jest-each';

beforeAll(async () => {
  await testConnection.connect();
  // await testConnection.dropDatabase();
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

const generateChannel = (id: number) => {
  const channel = new Channel();
  channel.id = id.toString(10);
  channel.name = 'new-channel-'+id;
  channel.nameNormalized = 'new-channel-'+id;
  channel.isEnabled = true;
  channel.isArchived = false;
  channel.duration = 20;
  return channel
}

each([
  ['2020-04-01T10:05:00', true],
  ['2020-04-01T11:05:00', false],
]).test('new channel', async (meetUpDateStart, greeting, done) => {
  const channelRepository = testConnection.getCustomRepository(ChannelRepository)
  const channel = channelRepository.create(generateChannel(1))

  channel.timezone = await testConnection.getRepository(Timezone).findOne({name : 'Europe/Moscow'})
  channel.start = '13:05';

  const user = testConnection.getRepository(User).create();
  user.id = '1';
  user.name = 'Alex';
  channel.users = [user]
  const dbChannel = await channelRepository.addNewChannel(channel);

  assert.strictEqual(dbChannel.id, '1');
  assert.strictEqual(dbChannel.questions.length, 3);
  assert.strictEqual(dbChannel.users.length, 1);

  const standUpBotService = testInjector.get(StandUpBotService) as StandUpBotService;
  standUpBotService.listenTransport();
  meetUpDateStart = new Date(meetUpDateStart);
  await standUpBotService.startDailyMeetUpByDate(meetUpDateStart)

  const testTransport = testInjector.get(TestTransport) as TestTransport;

  if (greeting) {
    assert.strictEqual(testTransport.calls.shift()[0], 'sendGreetingMessage', 'Greet');

    testTransport.agreeToStart$.next({user, date: meetUpDateStart});
    await sleep(300);
    assert.strictEqual(testTransport.calls.shift()[0], 'sendMessage');

    const msg = {
      team: dbChannel,
      user: user,
      createdAt: meetUpDateStart
    }

    testTransport.messages$.next([
      {...msg, text: '1'},
      {...msg, text: '2'},
      {...msg, text: '3'},
    ])

    await sleep(300);

    assert.strictEqual(testTransport.calls.length, 1);
    assert.strictEqual(testTransport.calls[0][0], 'sendMessage', 'Bay bay');
  } else {
    assert.strictEqual(testTransport.calls.length, 0);
  }

  testTransport.reset()

  done();
})
