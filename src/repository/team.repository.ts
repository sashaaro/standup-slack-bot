import {EntityManager, EntityRepository, Repository, Transaction, UpdateQueryBuilder} from "typeorm";
import {Team, TEAM_STATUS_ACTIVATED} from "../model/Team";
import {scopeTeamJoins} from "./scopes";
import {formatTime} from "../services/utils";
import Question from "../model/Question";
import QuestionOption from "../model/QuestionOption";
import {TeamSnapshot} from "../model/TeamSnapshot";
import QuestionSnapshot from "../model/QuestionSnapshot";
import QuestionOptionSnapshot from "../model/QuestionOptionSnapshot";

@EntityRepository(Team)
export class TeamRepository extends Repository<Team> {
  findByStart(startedAt: Date): Promise<Team[]> {
    const qb = this.createQueryBuilder('team');

    scopeTeamJoins(qb);

    return qb
      .innerJoinAndSelect('team.timezone', 'timezone')
      .innerJoin( 'pg_timezone_names', 'pg_timezone', 'timezone.name = pg_timezone.name')
      .andWhere(`(team.start::time - pg_timezone.utc_offset) = :start::time`, {start: formatTime(startedAt, false)})
      .andWhere('team.status = :status', {status: TEAM_STATUS_ACTIVATED})
      .getMany();
  }

  async findActiveById(id) {
    return await this
      // .findOne({id: id, isEnabled: true}, {relations: ['timezone', 'questions', 'workspace', 'users', 'questions.options']})
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'timezone')
      .leftJoinAndSelect('t.questions', 'questions')
      .leftJoinAndSelect('t.workspace', 'workspace')
      .leftJoinAndSelect('t.reportChannel', 'reportChannel')
      .leftJoinAndSelect('t.users', 'users')
      .leftJoinAndSelect('questions.options', 'options')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .where("t.id = :id", {id: id})
      .andWhere('questions.isEnabled = true')
      .andWhere('t.status = :status', {status: TEAM_STATUS_ACTIVATED})
      .orderBy("questions.index", "ASC")
      .getOne()
  }

  async add(team: Team) {
    return await this.manager.transaction('SERIALIZABLE', async manager => {
      const teamRepo = this.manager.getRepository(Team)
      await teamRepo.insert(team)
      await this.insertSnapshot(team, manager)
    });
  }

  async findSnapshot(team: Team, manager?: EntityManager) {
    return await (manager || this.manager).getRepository(TeamSnapshot).findOne({
      originTeam: team,
    }, {
      order: {createdAt: 'DESC'}
    })
  }

  async insertSnapshot(team: Team, manger?: EntityManager): Promise<TeamSnapshot> {
    const teamSnapshot = this.createSnapshot(team);
    await (manger || this.manager).insert(TeamSnapshot, teamSnapshot)
    return teamSnapshot;
  }

  createSnapshot(team: Team): TeamSnapshot {
    const teamSnapshot = new TeamSnapshot();
    teamSnapshot.originTeam = team;
    teamSnapshot.users = [...team.users];
    teamSnapshot.questions = team.questions.filter(q => q.isEnabled).map(q => {
      const questionSnapshot = new QuestionSnapshot()
      questionSnapshot.originQuestion = q
      questionSnapshot.text = q.text
      questionSnapshot.index = q.index
      questionSnapshot.team = teamSnapshot
      questionSnapshot.options = q.options.filter(o => o.isEnabled).map(o => {
        const optionSnapshot = new QuestionOptionSnapshot()
        optionSnapshot.question = questionSnapshot;
        // optionSnapshot.index = o.index // TODO!
        optionSnapshot.text = o.text

        return optionSnapshot;
      })

      return questionSnapshot;
    })

    return teamSnapshot;
  }

  async submit(team: Team) {
    if (team.users.length === 0) {
      new Error('Invalid team')
    }
    if (team.questions.length === 0) {
      new Error('Invalid team')
    }
    return await this.manager.transaction('SERIALIZABLE', async manager => {
      await manager.getRepository(Team)
        .createQueryBuilder()
        .update({
          name: team.name,
          duration: team.duration,
          timezone: team.timezone,
          start: team.start,
          reportChannel: team.reportChannel,
          // users: team.users
        })
        .where({id: team.id})
        .execute();

      // remove users which not include in users
      let sql = `DELETE FROM user_teams_team WHERE "teamId" = $1 ${
        team.users.length ? `AND "userId" NOT IN (${team.users.map((u, i) => `$${i + 2}`).join(',') }` : ``
      })`
      await manager.connection.query(
          sql, [
          team.id,
          ...team.users.map(u => u.id)
        ]);
      // add new users
      await manager.query(
        `INSERT INTO user_teams_team ("teamId", "userId") VALUES ${team.users.map((u, i) => `($1, $${i + 2})`).join(',')} ON CONFLICT DO NOTHING`,
        [
          team.id,
          ...team.users.map(u => u.id)
        ]);

      const questionRepository = manager.getRepository(Question)
      const optionsRepository = manager.getRepository(QuestionOption)

      const newQuestions = team.questions.filter(q => !q.id)
      const existQuestions = team.questions.filter(q => !!q.id)

      // mark as disabled removed questions
      let qb = questionRepository
        .createQueryBuilder()
        .update(Question, {isEnabled: false})
        .where('teamId = :team', {team: team.id}) as UpdateQueryBuilder<any>

      if (existQuestions.length) {
        qb = qb.andWhere('id NOT IN(:...questions)', {questions: existQuestions.map(q => q.id)})
      }
      await qb.execute();

      await Promise.all([
        // update existed questions
        ...existQuestions.map(q => questionRepository
            .createQueryBuilder()
            .update(Question, {text: q.text, index: q.index})
            .where({id: q.id})
            .execute()),
      ])
      await Promise.all([
        // add new Questions
        ...newQuestions.map(q => {
          // TODO find same.. in
          q.team = team;
          return questionRepository.insert(q);
        })
      ])

      for (const q of team.questions) {
        const options = q.options

        const newOptions = options.filter(o => !o.id);
        const existOptions = options.filter(o => !!o.id)

        // mark as disabled removed options
        qb = optionsRepository
          .createQueryBuilder()
          .update(QuestionOption, {isEnabled: false})
          .where({question: q})
        if (existOptions.length) {
          qb = qb.andWhere('id NOT IN(:...options)', {options: existOptions.map(o => o.id)})
        }
        await qb.execute()

        await Promise.all([
          ...existOptions.map(o => questionRepository
              .createQueryBuilder()
              .update(QuestionOption, {text: o.text})
              .where({id: o.id})
              .execute()
          ),
        ])
        await Promise.all([
          ...newOptions.map(o => {
            // TODO find same
            o.question = q;
            return optionsRepository.insert(o);
          })
        ]);
      }

      const lastSnapshot = await this.findSnapshot(team, manager);
      const newSnapshot = this.createSnapshot(await manager.findOne(Team, team.id, {
        relations: ['users', 'questions']
      }));

      if (!lastSnapshot || lastSnapshot.equals(newSnapshot)) {
        await manager.insert(TeamSnapshot, newSnapshot)
      }
    })
  }
}
