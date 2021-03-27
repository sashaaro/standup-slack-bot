import {TEAM_STATUS_ACTIVATED} from "../model/Team";
import {scopeTeamJoins} from "./scopes";
import {formatTime, sortByIndex} from "../services/utils";
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

export class TeamRepository extends EntityRepository<Team> {
  findByStart(startedAt: Date): Promise<Team[]> {
    const qb = this.em.createQueryBuilder<Team>(Team, 'team');
    qb.select('*')
    scopeTeamJoins(qb);

    return qb
      .joinAndSelect('team.timezone', 'timezone')
      .joinAndSelect('team.workspace', 'workspace')
      .joinAndSelect( 'pg_timezone_names', 'pg_timezone', 'timezone.name = pg_timezone.name')
      .andWhere(`(team.start::time - pg_timezone.utc_offset) = ?::time`, [formatTime(startedAt, false)])
      .andWhere({'team.status': TEAM_STATUS_ACTIVATED})
      .andWhere(
          '((extract("dow" from ? at time zone pg_timezone.name)::int + 6) % 7) = ANY(team.days)',
          [startedAt])
      .getResultList();
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

  async add(team: Team) {
    return await this.em.transactional( async manager => {
      console.log(team.questions.map(q => q.id))
      await manager.getRepository(Team).persist(team)
      console.log(team.questions.map(q => q.id))
      await this.insertSnapshot(team, manager)
    });
  }

  async findSnapshot(team: Team) {
    // return await this.em.findOne(TeamSnapshot, {
    //   'originTeam.id': team.id
    // }, [
    //   'users', 'questions', 'questions.options', 'questions.originQuestion', 'originTeam',
    //   'originTeam.workspace'
    // ], {'ts.createdAt': 'DESC'})
  }

  async insertSnapshot(team: Team, manager): Promise<TeamSnapshot> {
    const teamSnapshot = this.createSnapshot(team);
    // await this.em.persist(TeamSnapshot, teamSnapshot)
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
        optionSnapshot.originOption = o;
        optionSnapshot.question = questionSnapshot;
        optionSnapshot.index = o.index
        optionSnapshot.text = o.text

        return optionSnapshot;
      })

      return questionSnapshot;
    })

    teamSnapshot.normalizeSort();

    return teamSnapshot;
  }

  async clearUnneededSnapshots() {
    const sql = `DELETE FROM team_snapshot WHERE id in (
        SELECT id FROM (
           SELECT team_snapshot.*, row_number() over (PARTITION BY team_snapshot."originTeamId" ORDER BY "createdAt" DESC) FROM team_snapshot
            left join stand_up su on team_snapshot.id = su."teamId" and su.id is null
        ) AS snapshow WHERE snapshow.row_number > 1
    )`;
    // TODO
  }

  async submit(teamDTO: TeamDTO) {
    return await this.em.transactional( async (em) => {
      if (teamDTO.id) {
        await em
          .createQueryBuilder(Team)
          .update({
            name: teamDTO.name,
            duration: teamDTO.duration,
            timezone: em.getReference(Timezone, teamDTO.timezoneId),
            start: teamDTO.start,
            reportChannel: em.getReference(Channel, teamDTO.reportChannelId),
            days: teamDTO.days
            // users: team.users
          })
          .where({id: teamDTO.id})
          .execute();
      } else {
        // insert?!
      }

      const team = await em.findOneOrFail(Team, teamDTO.id)

      // remove users which not include in users
      let sql = `DELETE FROM user_teams WHERE "team_id" = ? AND "user_id" NOT IN (${teamDTO.userIds.map((u, i) => `?`).join(',') })`
      await em.execute(sql, [
          team.id,
          ...teamDTO.userIds
        ]);
      // add new users
      await em.execute(
        `INSERT INTO user_teams ("team_id", "user_id") VALUES ${teamDTO.userIds.map((u, i) => `(?, ?)`).join(',')} ON CONFLICT DO NOTHING`,
        teamDTO.userIds.map(uid => [teamDTO.id, uid]).flat()
      );


      const newQuestions = teamDTO.questions.filter(q => !q.id)
      const existQuestions = teamDTO.questions.filter(q => !!q.id)

      // mark as disabled removed questions
      let qb: QueryBuilder<any> = em.createQueryBuilder(Question)
        .update({isEnabled: false})
        .where('team_id = ?', [teamDTO.id])

      if (existQuestions.length) {
        qb = qb.andWhere(`id NOT IN(${existQuestions.map(d => '?').join(',')})`, [existQuestions.map(q => q.id)])
      }
      await qb.execute();

      // await Promise.all([
      //   // update existed questions
      //   ...existQuestions.map(q => em
      //       .createQueryBuilder(Question)
      //       .update({text: q.text, index: q.index})
      //       .where({id: q.id})
      //       .execute()),
      // ]);
      const newQ = newQuestions.map(q => em.create(Question, {...q, team: em.getReference(Team, teamDTO.id)}))
      //await em.persist(newQ);

      for (const q of teamDTO.questions) {
        const options = q.options.sort(sortByIndex)

        const newOptions = options.filter(o => !o.id);
        const existOptions = options.filter(o => !!o.id)

        // mark as disabled removed options
        // qb = em
        //   .createQueryBuilder(QuestionOption)
        //   .update({isEnabled: false})
        //   .where({question_id: q.id})
        // if (existOptions.length) {
        //   qb = qb.andWhere({id: {$in: existOptions.map(o => o.id)}})
        // }
        // await qb.execute()
        // await Promise.all([
        //   ...existOptions.map(o => em
        //       .createQueryBuilder(QuestionOption)
        //       .update({text: o.text, index: o.index})
        //       .where({id: o.id})
        //       .execute()
        //   ),
        // ])

        // await Promise.all([
        //   ...newOptions.map(o => {
        //     // TODO find same
        //     return em.persist(em.create(QuestionOption, {...o, question: q}));
        //   })
        // ]);
      }

      // const lastSnapshot = await this.findSnapshot(team, em);
      // const newSnapshot = this.createSnapshot(await em.findOne(Team, team.id, {
      //   relations: ['users', 'questions']
      // }));
      //
      //lastSnapshot?.normalizeSort()
      //
      // if (!lastSnapshot || !lastSnapshot.equals(newSnapshot)) {
      //   await manager.getRepository(TeamSnapshot).save(newSnapshot)
      // }
    })
  }
}
