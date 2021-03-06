import {EntityRepository, Repository, Transaction} from "typeorm";
import {Team, TEAM_STATUS_ACTIVATED} from "../model/Team";
import {scopeTeamJoins} from "./scopes";
import {formatTime} from "../services/utils";
import Question from "../model/Question";
import QuestionOption from "../model/QuestionOption";

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

  async submit(team: Team) {
    return await this.manager.transaction(async manager => {
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

      await manager.connection.query(
        `DELETE FROM user_teams_team WHERE "teamId" = $1 AND "userId" NOT IN (${team.users.map((u, i) => `$${i + 2}`).join(',')})`, [
          team.id,
          ...team.users.map(u => u.id)
        ]);
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

      console.log(newQuestions, existQuestions);

      if (existQuestions.length) {
        await questionRepository // mark as disabled removed questions
          .createQueryBuilder()
          .update(Question, {isEnabled: false})
          .where('teamId = :team', {team: team.id})
          .andWhere('id NOT IN(:...questions)', {questions: existQuestions.map(q => q.id)})
          .execute();
      }
      await Promise.all(existQuestions.map(q => questionRepository
        .createQueryBuilder()
        .update(Question, {text: q.text, index: q.index})
        .where({id: q.id})
        .execute())
      )

      await Promise.all(newQuestions.map(q => {
        // TODO find same.. in
        q.team = team;
        return questionRepository.insert(q);
      }));

      for (const q of team.questions.filter(q => q.options.length)) {
        const options = q.options

        const newOptions = options.filter(o => !o.id);
        const existOptions = options.filter(o => !!o.id)

        if (existOptions.length) {
          await optionsRepository // mark as disabled removed options
            .createQueryBuilder()
            .update(QuestionOption, {isEnabled: false})
            .where({question: q})
            .andWhere('id NOT IN(:...options)', {options: existOptions.map(o => o.id)})
            .execute()
        }

        await Promise.all(existOptions.map(o => questionRepository
          .createQueryBuilder()
          .update(QuestionOption, {text: o.text})
          .where({id: o.id})
          .execute()
        ));

        await Promise.all(newOptions.map(o => {
          // TODO find same
          o.question = q;
          return optionsRepository.insert(o);
        }))
      }
    })
  }
}
