import {createQuestion, generateChannel, simpleFixture, testConnection} from "../utils";
import {TeamRepository} from "../../src/repository/team.repository";
import {plainToClassFromExist} from "class-transformer";
import {validateSync} from "class-validator";
import assert from "assert";
import {Team} from "../../src/model/Team";
import Timezone from "../../src/model/Timezone";
import {Channel} from "../../src/model/Channel";

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
    const plainObject = {
      name: 'new name',
      timezone: {id: newTimezone.id},
      start: '15:00',
      duration: 5,
      users: team.users.map(u => ({id: u.id})),
      reportChannel: {id: newChannel.id},
      questions: team.questions.map(q => ({id: q.id, text: q.text, index: q.index}))
    } as Partial<Team>

    plainToClassFromExist(team, plainObject, {
      strategy: 'excludeAll'
    });
    const errors = validateSync(team)
    assert.strictEqual(errors.length, 0, 'Errors: ' + errors);
    await teamRepository.submit(team);
    team = await teamRepository.findActiveById(team.id)

    assert.deepStrictEqual({
      name: team.name,
      timezone: {id: team.timezone},
      start: team.start,
      duration: team.duration,
      users: team.users,
      reportChannel: {id: team.reportChannel.id},
      questions: team.questions.map(q => ({index: q.index, text: q.text})),
    }, plainObject);

    done();
  });

  test('add questions', async (done) => {
    let {team} = await simpleFixture(testConnection.manager);

    const addQuestions = [{id: undefined, text: '11'}, {id: undefined, text: '22'}]
    const plainObject = {
      name: team.name,
      timezone: team.timezone,
      start: team.start,
      duration: team.duration,
      users: team.users.map(u => ({id: u.id})),
      reportChannel: team.reportChannel,
      questions: [...team.questions, ...addQuestions].map(q => ({id: q.id, text: q.text}))
    } as Partial<Team>

    plainObject.questions.forEach((q, i) => q.index = i);

    plainToClassFromExist(team, plainObject, {
      strategy: 'excludeAll'
    });
    const errors = validateSync(team)
    assert.strictEqual(errors.length, 0, 'Errors: ' + errors);
    await teamRepository.submit(team);
    team = await teamRepository.findActiveById(team.id)

    assert.deepStrictEqual({
      name: team.name,
      timezone: team.timezone,
      start: team.start,
      duration: team.duration,
      users: team.users.map(u => ({id: u.id})),
      reportChannel: team.reportChannel,
      questions: team.questions.map(q => ({index: q.index, text: q.text})),
    }, plainObject);

    assert.strictEqual(5, team.questions.filter(q => q.isEnabled).length);

    done();
  });
})
