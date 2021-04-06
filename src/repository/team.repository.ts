import {scopeTeamJoins} from "./scopes";
import {formatTime, sleep, sortByIndex} from "../services/utils";
import {EntityRepository, QueryBuilder} from "@mikro-orm/postgresql";
import {
  Team,
  TeamSnapshot,
  QuestionSnapshot,
  QuestionOptionSnapshot,
  Timezone,
  Channel,
  Question,
  QuestionOption
} from "../entity";
import {TeamDTO} from "../dto/team-dto";
import {TEAM_STATUS_ACTIVATED} from "../entity/team";
import {retriedTx} from "../decorator/retried-tx";

export class TeamRepository extends EntityRepository<Team> {
  findByStart(startedAt: Date): Promise<Team[]> {
    const qb = this.em.createQueryBuilder<Team>(Team, 'team');
    qb.select('*')
    scopeTeamJoins(qb);

    qb
      .joinAndSelect('team.timezone', 'timezone')
      .joinAndSelect('team.workspace', 'workspace')
      //.andWhere(`(team.start::time - timezone.utc_offset) = ?::time`, [formatTime(startedAt, false)])
      .andWhere({'team.status': TEAM_STATUS_ACTIVATED})
      .andWhere(
          '((extract("dow" from ? at time zone timezone.name)::int + 6) % 7) = ANY(team.days)',
          [startedAt])

    return qb.getResultList()
  }

  async findActiveById(id) {
    return await this.em
      .createQueryBuilder(Team, 't')
      .select('*')
      .leftJoinAndSelect('t.timezone', 'timezone')
      .leftJoinAndSelect('t.questions', 'questions')
      .leftJoinAndSelect('t.workspace', 'workspace')
      .leftJoinAndSelect('t.reportChannel', 'reportChannel')
      .leftJoinAndSelect('t.users', 'users')
      .leftJoinAndSelect('questions.options', 'options')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .where({
        't.id': id,
        'questions.isEnabled': true,
        't.status': TEAM_STATUS_ACTIVATED
      })
      .orderBy({"questions.index": "asc", "options.index": "asc"})
      .limit(1)
      .getSingleResult()
  }

  async findSnapshot(team: Team): Promise<TeamSnapshot> {
    return await this.em.findOne(TeamSnapshot, {
      'originTeam': team
    }, [
      'users', 'questions', 'questions.options', 'questions.originQuestion', 'originTeam',
      'originTeam.workspace'
    ], {
      'createdAt': 'DESC',
      // 'questions.index': 'ASC',
      // 'questions.options.index': 'ASC'
    })
  }

  createSnapshot(team: Team): TeamSnapshot {
    const teamSnapshot = new TeamSnapshot();
    teamSnapshot.originTeam = team;
    team.users.getItems().forEach(u => teamSnapshot.users.add(u));
    team.questions.getItems().filter(q => q.isEnabled).forEach(q => {
      const questionSnapshot = new QuestionSnapshot()
      questionSnapshot.originQuestion = q
      questionSnapshot.text = q.text
      questionSnapshot.index = q.index
      questionSnapshot.team = teamSnapshot
      q.options.getItems().filter(o => o.isEnabled).forEach(o => {
        const optionSnapshot = new QuestionOptionSnapshot()
        optionSnapshot.originOption = o;
        optionSnapshot.question = questionSnapshot;
        optionSnapshot.index = o.index
        optionSnapshot.text = o.text

        questionSnapshot.options.add(optionSnapshot);
      })

      teamSnapshot.questions.add(questionSnapshot)
    })

    teamSnapshot.normalizeSort();

    return teamSnapshot;
  }

  async clearUnneededSnapshots() {
    const sql = `DELETE FROM team_snapshot WHERE id in (
        SELECT id FROM (
         SELECT team_snapshot.*, row_number() over (PARTITION BY team_snapshot."origin_team_id" ORDER BY "created_at" DESC) 
         FROM team_snapshot left join standup su on team_snapshot.id = su."team_id" and su.id is null
     ) AS snapshow WHERE snapshow.row_number > 1
    )`;
    await this.em.execute(sql)
  }

  @retriedTx
  async submit(teamDTO: TeamDTO): Promise<Team> {
    const em = this.em;
    await em
      .createQueryBuilder(Team)
      .update({
        name: teamDTO.name,
        days: teamDTO.days,
        start: teamDTO.start,
        timezone: em.getReference(Timezone, teamDTO.timezoneId),
        duration: teamDTO.duration,
        reportChannel: em.getReference(Channel, teamDTO.reportChannelId),
      })
      .where({id: teamDTO.id})
      .execute();

    // remove users which not include in users
    let sql = `DELETE FROM user_teams WHERE "team_id" = ? AND "user_id" NOT IN (${teamDTO.userIds.map((u, i) => `?`).join(',') })`
    await em.execute(sql, [
      teamDTO.id,
        ...teamDTO.userIds
      ]);
    // add new users
    await em.execute(
      `INSERT INTO user_teams ("team_id", "user_id") VALUES ${teamDTO.userIds.map((u, i) => `(?, ?)`).join(',')} ON CONFLICT DO NOTHING`,
      teamDTO.userIds.map(uid => [teamDTO.id, uid]).flat() // TODO validate your workspace!
    );


    const newQuestions = teamDTO.questions.filter(q => !q.id)
    const existQuestions = teamDTO.questions.filter(q => !!q.id)

    // mark as disabled removed questions
    let qb: QueryBuilder<any> = em.createQueryBuilder(Question)
      .update({isEnabled: false})
      .where('team_id = ?', [teamDTO.id])
    if (existQuestions.length) {
      qb = qb.andWhere(`id NOT IN(${existQuestions.map(d => '?').join(',')})`, existQuestions.map(q => q.id))
    }
    await qb.execute();

    await Promise.all([
      // update existed questions
      ...existQuestions.map(q => em
          .createQueryBuilder(Question)
          .update({text: q.text, index: q.index})
          .where({id: q.id})
          .execute()),
    ]);
    const newQ = newQuestions.map(q => em.create(Question, {...q, team: em.getReference(Team, teamDTO.id)}))
    await em.persist(newQ); // TODO remove?!

    for (const q of teamDTO.questions) {
      const options = q.options.sort(sortByIndex)

      const newOptions = options.filter(o => !o.id);
      const existOptions = options.filter(o => !!o.id)

      // mark as disabled removed options
      qb = em
        .createQueryBuilder(QuestionOption)
        .update({isEnabled: false})
        .where({question_id: q.id})
      if (existOptions.length) {
        qb = qb.andWhere({id: {$in: existOptions.map(o => o.id)}})
      }
      await qb.execute()
      await Promise.all([
        ...existOptions.map(o => em
            .createQueryBuilder(QuestionOption)
            .update({text: o.text, index: o.index})
            .where({id: o.id})
            .execute()
        ),
      ])

      await em.persist(
        newOptions.map(o => em.create(QuestionOption, {...o, question: q})) // TODO find same
      );
    }

    const team = await this.findOneOrFail(teamDTO.id, ['users', 'questions', 'questions.options'])
    const lastSnapshot = await this.findSnapshot(team);
    const newSnapshot = this.createSnapshot(team);

    //lastSnapshot?.normalizeSort()

    if (!lastSnapshot || !lastSnapshot.equals(newSnapshot)) {
      await em.persist(newSnapshot)
    }

    await sleep(10000);

    return team;
  }
}
