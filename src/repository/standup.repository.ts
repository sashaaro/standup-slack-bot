import {EntityRepository, Repository} from "typeorm";
import StandUp from "../model/StandUp";
import User from "../model/User";
import {qbActiveQuestions, qbAuthorAnswers, qbStandUpDate, qbStandUpJoins} from "./scopes";
import {formatTime} from "../services/utils";
import UserStandup from "../model/UserStandup";

@EntityRepository(StandUp)
export class StandUpRepository extends Repository<StandUp> {
  findByUser(user: User, date: Date): Promise<StandUp> {
    const qb = this.createQueryBuilder('standup');

    qb.orderBy('standup.startAt', "ASC")

    qbStandUpJoins(qb);
    qb.andWhere('users.id = :user', {user: user.id});
    qbStandUpDate(qb, date);
    qbActiveQuestions(qb);
    qbAuthorAnswers(qb, user);

    return qb
      .take(1)
      .getOne();
  }

  findEnd(date: Date): Promise<StandUp[]> {
    const qb = this.createQueryBuilder('standup');
    qbStandUpJoins(qb);
    qbActiveQuestions(qb);
    qb.leftJoinAndSelect('teamSnapshot.users', 'snapshotUsers')

    // database timzone and nodejs process timezone should be same!
    qb.andWhere(`date_trunc('minute', standup.endAt)::time = :startedAt::time`, {startedAt: formatTime(date, false)})

    return qb.getMany();
  }

  findUserStandUp(user: User, standUpId: any): Promise<UserStandup> {
    return this.manager.getRepository(UserStandup).findOne({
      user,
      standUp: this.manager.create(StandUp, {id: standUpId})
    })
  }

  standUpByIdAndUser(user: User, standUpId: any): Promise<StandUp> {
    const qb = this.createQueryBuilder('standup');

    qbStandUpJoins(qb)

    qb.andWhere('users.id = :user AND standup.id = :standupID', {user: user.id, standupID: standUpId})
    qbActiveQuestions(qb);
    qbAuthorAnswers(qb, user);
    qb.leftJoinAndSelect('answers.option', 'optionAnswer')

    return qb
      .take(1)
      //.orderBy('st.start', "DESC")
      .getOne();
  }
}
