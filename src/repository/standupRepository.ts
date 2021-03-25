import Standup from "../entity/standup";
import {qbStandupJoins, scopeTeamSnapshotJoins, scopeTeamWorkspaceJoins, scopeUserAnswerQuestion} from "./scopes";
import UserStandup from "../entity/user-standup";
import {Repository} from "@mikro-orm/core";
import {EntityRepository} from "@mikro-orm/postgresql";

@Repository(Standup)
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
    qb.andWhere(`date_trunc('minute', standup.endAt) = date_trunc('minute', ?::timestamp)`, [endAt])

    return qb.getResultList();
  }

  findUserStandup(userId: string, standupId: number): Promise<UserStandup> {
    const qb = this.em.getRepository(UserStandup).createQueryBuilder('userStandup')
      .andWhere({'userStandup.userId': userId}) // TODO add unique index userId standupId
      .andWhere({'userStandup.standupId': standupId})
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('userStandup.standup', 'standup')

    scopeTeamWorkspaceJoins(qb)
    scopeTeamSnapshotJoins(qb)
    scopeUserAnswerQuestion(qb)

    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      //TODO .take(1)
      .getSingleResult()
  }
}
