import {EntityRepository, Repository} from "typeorm";
import StandUp from "../model/StandUp";
import {qbStandUpJoins, scopeTeamSnapshotJoins, scopeTeamWorkspaceJoins, scopeUserAnswerQuestion} from "./scopes";
import UserStandup from "../model/UserStandup";

@EntityRepository(StandUp)
export class StandUpRepository extends Repository<StandUp> {
  findByIdAndUser(userId: string, standupId: number): Promise<StandUp> {
    const qb = this.createQueryBuilder('standup');

    qbStandUpJoins(qb)
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

  findEnd(endAt: Date): Promise<StandUp[]> {
    const qb = this.createQueryBuilder('standup');
    qbStandUpJoins(qb);
    qb.leftJoinAndSelect('answersQuestion.options', 'answersQuestionOptions')
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('team.reportChannel', 'reportChannel')

    // TODO! database timzone and nodejs process timezone should be same!
    qb.andWhere(`date_trunc('minute', standup.endAt) = date_trunc('minute', :endAt::timestamp)`, {endAt})

    return qb.getMany();
  }

  findUserStandUp(userId: string, standUpId: number): Promise<UserStandup> {
    const qb = this.manager.getRepository(UserStandup).createQueryBuilder('userStandup')
      .andWhere('userStandup.userId = :userId', {userId}) // TODO add unique index userId standUpId
      .andWhere('userStandup.standUpId = :standUpId', {standUpId})
      .leftJoinAndSelect('userStandup.user', 'user')
      .leftJoinAndSelect('userStandup.standUp', 'standup')

    scopeTeamWorkspaceJoins(qb)
    scopeTeamSnapshotJoins(qb)
    scopeUserAnswerQuestion(qb)

    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      .take(1)
      .getOne()
  }
}
