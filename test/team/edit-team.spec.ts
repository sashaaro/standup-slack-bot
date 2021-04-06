import {generateChannel, simpleFixture, testConnection} from "../utils";
import {TeamRepository} from "../../src/repository/team.repository";
import {plainToClassFromExist} from "class-transformer";
import {validateSync} from "class-validator";
import assert from "assert";
import {Channel, Team, Timezone} from "../../src/entity";
import {TeamDTO} from "../../src/dto/team-dto";

describe('Edit team', () => {
  let teamRepository: TeamRepository;

  beforeAll(async () => {
    await testConnection.connect()
    teamRepository = testConnection.manager.getCustomRepository(TeamRepository)
  });

  test('edit left section form', async (done) => {
    let {team} = await simpleFixture(testConnection.manager);

    const newTimezone = await testConnection.getRepository(Timezone).findOne(5);
    const newChannel = generateChannel();
    await testConnection.manager.getRepository(Channel).save(newChannel);
    const teamDto = {
      id: team.id,
      name: 'new name',
      timezoneId: newTimezone.id,
      start: '15:00',
      duration: 5,
      userIds: team.users.getItems().map(u => u.id),
      reportChannelId: newChannel.id,
      questions: team.questions.getItems().map(q => ({id: q.id, text: q.text, index: q.index}))
    } as TeamDTO

    await teamRepository.submit(teamDto);
    team = await teamRepository.findActiveById(team.id)

    assert.deepStrictEqual({
      name: team.name,
      timezone: {id: team.timezone},
      start: team.start,
      duration: team.duration,
      users: team.users,
      reportChannel: {id: team.reportChannel.id},
      questions: team.questions.getItems().map(q => ({index: q.index, text: q.text})),
    }, teamDto);

    done();
  });
})
