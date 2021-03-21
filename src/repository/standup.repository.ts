import {EntityRepository, Repository} from "typeorm";
import StandUp from "../model/StandUp";
import {qbStandUpJoins} from "./scopes";
import UserStandup from "../model/UserStandup";

@EntityRepository(StandUp)
export class StandUpRepository extends Repository<StandUp> {
  findByIdAndUser(userId: string, standupId: number): Promise<StandUp> {
    const qb = this.createQueryBuilder('standup');

    qbStandUpJoins(qb)
    
    qb.andWhere('users.id = :userId AND standup.id = :standupId', {userId, standupId})
    qb.andWhere('userStandup.userId = :userId', {userId});
    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      .limit(1)
      //.orderBy('st.start', "DESC")
      .getOne();
  }

  findEnd(endAt: Date): Promise<StandUp[]> {
    const qb = this.createQueryBuilder('standup');
    qbStandUpJoins(qb);
    // TODO! database timzone and nodejs process timezone should be same!
    qb.andWhere(`date_trunc('minute', standup.endAt) = date_trunc('minute', :endAt::timestamp)`, {endAt})

    return qb.getMany();
  }

  findUserStandUp(userId: string, standUpId: number): Promise<UserStandup> {
    return this.manager.getRepository(UserStandup).createQueryBuilder('us')
      .andWhere('us.userId = :userId', {userId}) // TODO add unique index userId standUpId
      .andWhere('us.standUpId = :standUpId', {standUpId})
      .leftJoinAndSelect('us.user', 'user')
      .leftJoinAndSelect('us.standUp', 'standUp')
      .limit(1)
      .getOne()
  }
}
