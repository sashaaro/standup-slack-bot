import {Channel} from "../src/model/Channel";
import {clearDatabase, testConnection, testInjector} from "./main";
import ChannelRepository from "../src/repository/ChannelRepository";
import assert from "assert";
import Timezone from "../src/model/Timezone";
import StandUpBotService from "../src/bot/StandUpBotService";
import {initFixtures} from "../src/services/providers";
import User from "../src/model/User";

beforeAll(async () => {
  await testConnection.connect();
  // await testConnection.dropDatabase();
  await testConnection.runMigrations();
})
beforeEach(async () => {
  await clearDatabase();
  await initFixtures(testConnection);
})

const generateChannel = (id: number) => {
  const channel = new Channel();
  channel.id = id.toString(10);
  channel.name = 'new-channel-'+id;
  channel.nameNormalized = 'new-channel-'+id;
  channel.isEnabled = true;
  channel.isArchived = false;
  return channel
}

test('new channel', async (done) => {
  const channelRepository = testConnection.getCustomRepository(ChannelRepository)
  const channel = channelRepository.create(generateChannel(1))

  channel.timezone = await testConnection.getRepository(Timezone).findOne({name : 'Europe/Moscow'})
  channel.start = '13:05';

  const user = testConnection.getRepository(User).create();
  user.id = '1';
  user.name = 'Alex';
  //user.channels = [channel];
  channel.users = [user]
  //await testConnection.manager.insert(User, user);

  const dbChannel = await channelRepository.addNewChannel(channel);

  assert.strictEqual(dbChannel.id, '1');
  assert.strictEqual(dbChannel.questions.length, 3);
  assert.strictEqual(dbChannel.users.length, 1);

  const standUpBotService = testInjector.get(StandUpBotService) as StandUpBotService;
  await standUpBotService.startDailyMeetUpByDate(new Date('2020-05-01T10:05:00'))

  done();
})
