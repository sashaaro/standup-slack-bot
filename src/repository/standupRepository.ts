import Standup from "../entity/standup";
import {qbStandupJoins, scopeTeamSnapshotJoins, scopeTeamWorkspaceJoins, scopeUserAnswerQuestion} from "./scopes";
import UserStandup from "../entity/user-standup";
import {EntityRepository} from "@mikro-orm/postgresql";
import {QueryFlag} from "@mikro-orm/core";
import {User} from "../entity";

export class StandupRepository extends EntityRepository<Standup> {
  findByIdAndUser(userId: string, standupId: number): Promise<Standup> {
    const qb = this.em.createQueryBuilder<Standup>('standup');

    qbStandupJoins(qb)
    scopeTeamSnapshotJoins(qb)
    qb.joinAndSelect('teamSnapshot.users', 'users')

    qb.andWhere('standup.id = ?', [standupId])
    qb.andWhere('users.id = ?', [userId]);
    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      /// TODO .take(1)
      //.orderBy('st.start', "DESC")
      .getSingleResult();
  }

  findEnd(endAt: Date): Promise<Standup[]> {
    const qb = this.createQueryBuilder('standup');
    qbStandupJoins(qb);
    qb.leftJoinAndSelect('answersQuestion.options', 'answersQuestionOptions')
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('team.reportChannel', 'reportChannel')

    // TODO! database timzone and nodejs process timezone should be same!
    qb.andWhere(`date_trunc('minute', standup.end_at) = date_trunc('minute', ?::timestamp)`, [endAt])

    return qb.getResultList();
  }

  findUserStandup(userId: string, standupId: number): Promise<UserStandup> {
    return this.em.findOne(UserStandup, {
      user: this.em.getReference(User, userId),
      standup: this.em.getReference(Standup, standupId)
    }, [
      'user',
      'standup',
      'standup.team',
      'standup.team.questions',
      'standup.team.questions.options',
      'standup.team.originTeam',
      'standup.team.originTeam.workspace',
      'answers',
      'answers.question',
    ]); // TODO check left join!
    const qb = this.em.getRepository(UserStandup).createQueryBuilder('userStandup')
      .where({user_id: userId, standup_id: standupId}) // TODO add unique index userId standupId
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('userStandup.standup', 'standup')

    scopeTeamWorkspaceJoins(qb)
    scopeTeamSnapshotJoins(qb)
    scopeUserAnswerQuestion(qb)

    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    console.log(111111);
    return qb
      //.setFlag(QueryFlag.PAGINATE)
      .limit(1)
      .execute()
  }
}
