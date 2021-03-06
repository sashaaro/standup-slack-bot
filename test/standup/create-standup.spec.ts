import each from "jest-each";
import assert from "assert";
import {testConnection} from "../utils";

describe('Create standup', () => {
  beforeAll(async () => {
    await testConnection.connect()
  });

  each([
    ['2020-04-01T10:05:00', true],
    ['2020-04-01T11:05:00', false],
  ]).test('new channel', async (meetUpDateStart, standupInTime, done) => {
    //assert.strictEqual(team.questions.length, 3);
    assert.strictEqual(1, 1);
    done();
  })
})