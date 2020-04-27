import Question from "./../src/model/Question";
import * as assert from 'assert';
import {Channel} from "../src/model/Channel";
import "reflect-metadata";
import {ReflectiveInjector} from "injection-js";
import {createProviders} from "../src/services/providers";
import {Connection} from "typeorm";
import ChannelRepository from "../src/repository/ChannelRepository";
import Timezone from "../src/model/Timezone";

const providers = createProviders( 'test');
const injector = ReflectiveInjector.resolveAndCreate(providers);
const connection: Connection = injector.get(Connection);

const clearDatabase = async () => {
  const entities = connection.entityMetadatas
    .filter(e => !dictionaryEntities.includes(e.target as any))

  for (const entity of entities) {
    await connection.getRepository(entity.target).query(`TRUNCATE "${entity.tableName}" CASCADE`)
  }
}

beforeAll(async () => {
  await connection.connect();
  await connection.dropDatabase();
  await connection.runMigrations();
})

afterAll(async () => {
  await connection.close();
})

const dictionaryEntities = [Timezone];

beforeEach(async () => {
  await clearDatabase()
});

afterEach(() => {
});

test('start standup', async (done) => {
  const channel = new Channel();
  channel.id = 'D3dKF92';
  channel.name = 'my-channel';
  channel.nameNormalized = 'my-channel';
  const channelRepository = connection.getCustomRepository(ChannelRepository)
  await channelRepository.addNewChannel(channel);

  assert.strictEqual((await channelRepository.findOne(channel.id)).id, channel.id);

  done();

  /*standUpBotService.finishStandUp$.subscribe((standUp: StandUp) => {
      assert.strictEqual(standUp.start, true);
      done()
  });*/
});

describe('Question', () => {
  describe('work well', () => {
    it('should work', () => {
      const q = new Question()
      assert.equal(q.isEnabled, true);
    });
  });
});
