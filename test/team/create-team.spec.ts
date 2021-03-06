import {
  simpleFixture,
  testConnection
} from "../utils";

describe('Create team', () => {
  beforeAll(async () => {
    await testConnection.connect()
  });

  it('create',  async (done) => {
    const {team} = await simpleFixture(testConnection.manager);
    done();
  });
})