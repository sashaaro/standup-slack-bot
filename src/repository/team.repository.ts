import {scopeTeamJoins} from "./scopes";
import {formatTime, sortByIndex} from "../services/utils";
import {EntityManager, EntityRepository, QueryBuilder} from "@mikro-orm/postgresql";
import {
  Channel,
  Question,
  QuestionOption,
  QuestionOptionSnapshot,
  QuestionSnapshot,
  Team,
  TeamSnapshot,
  Timezone
} from "../entity";
import {TeamDTO} from "../dto/team-dto";
import {TEAM_STATUS_ACTIVATED, weekDayBits} from "../entity/team";
import {transactional} from "../decorator/transactional";
import {LoadStrategy, QueryFlag} from "@mikro-orm/core";

export class TeamRepository extends EntityRepository<Team> {
  findByStart(startedAt: Date): Promise<Team[]> {
    const qb = this.em.createQueryBuilder<Team>(Team, 'team');
    qb.select('*')
    scopeTeamJoins(qb);

    const convertWeekDayToBitSql = (weekDaySql) => `('{${weekDayBits.join(',')}}'::integer[${weekDayBits.length}])[${weekDaySql}]::bit(7)`; // use postgres function?!
    qb
      .joinAndSelect('team.timezone', 'timezone')
      .joinAndSelect('team.workspace', 'workspace')
      .andWhere(`(team.start::time - timezone.utc_offset) = ?::time`, [formatTime(startedAt, false)])
      .andWhere({'team.status': TEAM_STATUS_ACTIVATED})
      .andWhere(
          `team.schedule_bitmask & ${convertWeekDayToBitSql('extract("isodow" from ? at time zone timezone.name)')} <> 0::bit(7)`,
          [startedAt])

    return qb.getResultList()
  }

  async findActiveById(id, onlyActive = true): Promise<Team> {
    const where: any = {
      id,
      questions: {
        isEnabled: true,
        // options: {
        //   isEnabled: {$in: [true, null]},
        // }
      }
    }
    if (onlyActive) {
      where.status = TEAM_STATUS_ACTIVATED
    }

    return (await this.em.find(Team, where, {
      populate: [
        'users',
        'questions',
        'questions.options',
        'timezone'
      ],
      strategy: LoadStrategy.SELECT_IN,
    }))[0];
    return await this.em
      .createQueryBuilder(Team, 't')
      //.select('*')
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
      .setFlag(QueryFlag.PAGINATE)
      .limit(1)
      .getSingleResult()
  }

  async findSnapshot(team: Team, em?: EntityManager): Promise<TeamSnapshot> {
    return await this.em.findOne(TeamSnapshot, {
      originTeam: team
    }, {
      populate: [
        'users',
        'originTeam',
        'originTeam.workspace',
        'questions',
        'questions.options',
        'questions.originQuestion',
      ],
      strategy: LoadStrategy.SELECT_IN,
      orderBy: {createdAt: 'DESC'}
    })

    em = em || this.em;
    const qb = em.createQueryBuilder(TeamSnapshot, 'ts')
    qb
      .select('*')
      .where({originTeam: team})
      .leftJoinAndSelect('ts.users', 'users')
      .leftJoinAndSelect('ts.originTeam', 'originTeam')
      .leftJoinAndSelect('originTeam.workspace', 'workspace')
      .leftJoinAndSelect('ts.questions', 'snapshotQuestions')
      .leftJoinAndSelect('snapshotQuestions.options', 'snapshotOptions')
      .leftJoinAndSelect('snapshotQuestions.originQuestion', 'originQuestion')
      .orderBy({createdAt: 'DESC'})
      .limit(1)
      .setFlag(QueryFlag.PAGINATE)

    const list = await qb.getResultList()
    return list[0] || null;
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
         FROM team_snapshot left join standup su on team_snapshot.id = su."team_id" where su.id is null
     ) AS snapshow WHERE snapshow.row_number > 1
    )`;
    await this.em.execute(sql)
  }

  @transactional
  async submit(teamDTO: TeamDTO): Promise<Team> {
    const em = this.em;
    await em
      .createQueryBuilder(Team)
      .update({
        name: teamDTO.name,
        scheduleBitmask: teamDTO.scheduleBitmask,
        start: teamDTO.start,
        timezone: em.getReference(Timezone, teamDTO.timezoneId),
        duration: teamDTO.duration,
        reportChannel: em.getReference(Channel, teamDTO.reportChannelId),
      })
      .where({id: teamDTO.id})
      .execute();

    // remove users which not include in users
    let sql = `DELETE FROM team_users WHERE "team_id" = ? AND "user_id" NOT IN (${teamDTO.userIds.map((u, i) => `?`).join(',') })`
    await em.execute(sql, [
      teamDTO.id,
        ...teamDTO.userIds
      ]);
    // add new users
    await em.execute(
      `INSERT INTO team_users ("team_id", "user_id") VALUES ${teamDTO.userIds.map((u, i) => `(?, ?)`).join(',')} ON CONFLICT DO NOTHING`,
      teamDTO.userIds.map(uid => [teamDTO.id, uid]).flat() // TODO validate your workspace!
    );

    const existQuestions = teamDTO.questions.filter(q => !!q.id)

    // mark as disabled removed questions
    let qb: QueryBuilder<any> = em.createQueryBuilder(Question)
      .update({isEnabled: false})
      .where({team: {id: teamDTO.id}})
    if (existQuestions.length) {
      //qb = qb.andWhere(`id NOT IN(${existQuestions.map(d => '?').join(',')})`, existQuestions.map(q => q.id))
      qb = qb.andWhere({id: {$nin: existQuestions.map(o => o.id)}})
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
    for (const q of teamDTO.questions) {
      if (!q.id) {
        const newQ = em.create(Question, {...q, team: em.getReference(Team, teamDTO.id), options: []})
        await em.persist(newQ);
        await em.flush();
        q.id = newQ.id
      }
      const options = q.options.sort(sortByIndex)

      const newOptions = options.filter(o => !o.id);
      const existOptions = options.filter(o => !!o.id)

      // mark as disabled removed options
      qb = em
        .createQueryBuilder(QuestionOption)
        .update({isEnabled: false})
        .where({question_id: q.id})
      if (existOptions.length) {
        qb = qb.andWhere({id: {$nin: existOptions.map(o => o.id)}})
      }
      await qb.execute()
      await Promise.all([
        ...existOptions.map(o => em
            .createQueryBuilder(QuestionOption)
            .update({text: o.text, index: o.index, isEnabled: true})
            .where({id: o.id})
            .execute()
        ),
      ])

      await em.persist(
        newOptions.map(o => em.create(QuestionOption, {...o, question: em.getReference(Question, q.id), isEnabled: true})) // TODO find same
      );
      await em.flush();
    }

    const team = await em.findOneOrFail(Team, {
      id: teamDTO.id,
      /*questions: {
        isEnabled: true,
        options: {
          isEnabled: true
        }
      } as any*/
    }, {
      populate: ['users', 'questions', 'questions.options'],
      refresh: true,
      strategy: LoadStrategy.JOINED
    })



    const lastSnapshot = await this.findSnapshot(team, em);
    const newSnapshot = this.createSnapshot(team);
    if (!lastSnapshot || !lastSnapshot.equals(newSnapshot)) {
      await em.persist(newSnapshot)
      await em.flush();
    }

    return team;
  }
}
