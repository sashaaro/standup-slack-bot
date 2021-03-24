import {EntityRepository, Repository} from "typeorm";
import Standup from "../model/Standup";
import {qbStandupJoins, scopeTeamSnapshotJoins, scopeTeamWorkspaceJoins, scopeUserAnswerQuestion} from "./scopes";
import UserStandup from "../model/UserStandup";

@EntityRepository(Standup)
export class StandupRepository extends Repository<Standup> {
  findByIdAndUser(userId: string, standupId: number): Promise<Standup> {
    const qb = this.createQueryBuilder('standup');

    qbStandupJoins(qb)
    scopeTeamSnapshotJoins(qb)
    qb.innerJoinAndSelect('teamSnapshot.users', 'users')

    qb.andWhere('standup.id = :standupId', {standupId})
    qb.andWhere('users.id = :userId', {userId});
    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      .take(1)
      //.orderBy('st.start', "DESC")
      .getOne();
  }

  findEnd(endAt: Date): Promise<Standup[]> {
    const qb = this.createQueryBuilder('standup');
    qbStandupJoins(qb);
    qb.leftJoinAndSelect('answersQuestion.options', 'answersQuestionOptions')
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('team.reportChannel', 'reportChannel')

    // TODO! database timzone and nodejs process timezone should be same!
    qb.andWhere(`date_trunc('minute', standup.endAt) = date_trunc('minute', :endAt::timestamp)`, {endAt})

    return qb.getMany();
  }

  findUserStandup(userId: string, standupId: number): Promise<UserStandup> {
    const qb = this.manager.getRepository(UserStandup).createQueryBuilder('userStandup')
      .andWhere('userStandup.userId = :userId', {userId}) // TODO add unique index userId standupId
      .andWhere('userStandup.standupId = :standupId', {standupId})
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('userStandup.standup', 'standup')

    scopeTeamWorkspaceJoins(qb)
    scopeTeamSnapshotJoins(qb)
    scopeUserAnswerQuestion(qb)

    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      .take(1)
      .getOne()
  }
}
