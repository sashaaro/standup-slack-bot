// with channel channelUsers questions answers answerAuthor
import {Brackets, SelectQueryBuilder} from "typeorm";
import {Team} from "../model/Team";
import StandUp from "../model/StandUp";
import User from "../model/User";

export function scopeTeamJoins(qb: SelectQueryBuilder<Team>): SelectQueryBuilder<Team> {
  return qb
    .innerJoinAndSelect('team.users', 'users') // TODO remove / reanme channelUsers
    .innerJoinAndSelect('team.questions', 'questions')
    .leftJoinAndSelect('questions.options', 'options')
}

export function scopeTeamSnapshotJoins(qb: SelectQueryBuilder<Team>): SelectQueryBuilder<Team> {
  return qb
      .leftJoinAndSelect('teamSnapshot.questions', 'snapshotQuestions')
      .leftJoinAndSelect('snapshotQuestions.options', 'snapshotOptions')
}

export function qbStandUpJoins(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
  qb.leftJoinAndSelect('standup.answers', 'answers')
    .leftJoinAndSelect('answers.user', 'answerAuthor')
    .leftJoinAndSelect('answers.question', 'answersQuestion')
    .innerJoinAndSelect('standup.team', 'teamSnapshot')
    .innerJoinAndSelect('teamSnapshot.originTeam', 'team');

  scopeTeamSnapshotJoins(qb);

  return scopeTeamJoins(qb); // TODO remove?
}

export function qbStandUpDate(qb: SelectQueryBuilder<StandUp>, date: Date): SelectQueryBuilder<StandUp> {
  return qb
    .andWhere(':date >= standup.startAt', {date})
    .andWhere(':date <= standup.endAt', {date});
}

export function qbAuthorAnswers(qb: SelectQueryBuilder<StandUp>, user: User): SelectQueryBuilder<StandUp> {
  return qb.andWhere(
    new Brackets(qb => {
      qb.where('answerAuthor.id = :answerAuthorID', {answerAuthorID: user.id})
      qb.orWhere('answerAuthor.id IS NULL')
    })
  )
}

export function qbActiveQuestions(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
  qb.andWhere('questions.isEnabled = true');
  return qb.orderBy("questions.index", "ASC");
}