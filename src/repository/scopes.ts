// with channel channelUsers questions answers answerAuthor
import {Brackets, SelectQueryBuilder} from "typeorm";
import {Team} from "../model/Team";
import Standup from "../model/Standup";
import User from "../model/User";

export function scopeTeamWorkspaceJoins(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
  return qb.innerJoinAndSelect('standup.team', 'teamSnapshot')
    .innerJoinAndSelect('teamSnapshot.originTeam', 'team')
    .innerJoinAndSelect('team.workspace', 'workspace')
}
export function scopeUserAnswerQuestion(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
  return qb.leftJoinAndSelect('userStandup.answers', 'answers')
    .leftJoinAndSelect('answers.question', 'answersQuestion')
}
export function scopeTeamJoins(qb: SelectQueryBuilder<Team>): SelectQueryBuilder<Team> {
  return qb
    .innerJoinAndSelect('team.users', 'users') // TODO remove
    .innerJoinAndSelect('team.questions', 'questions')
    .leftJoinAndSelect('questions.options', 'options')
}

export function scopeTeamSnapshotJoins(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
  return qb
    .innerJoinAndSelect('teamSnapshot.questions', 'questionSnapshot')
    .leftJoinAndSelect('questionSnapshot.options', 'optionSnapshot')
}

export function qbStandupJoins(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
  scopeTeamWorkspaceJoins(qb)
  qb.leftJoinAndSelect('standup.users', 'userStandup');
  return scopeUserAnswerQuestion(qb)
}