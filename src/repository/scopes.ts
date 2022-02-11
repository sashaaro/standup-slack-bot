// with channel channelUsers questions answers answerAuthor
import {Team} from "../entity/team";
import {QueryBuilder} from "@mikro-orm/postgresql";

export function scopeTeamWorkspaceJoins(qb: QueryBuilder<any>): QueryBuilder<any> {
  return qb.joinAndSelect('standup.team', 'teamSnapshot')
    .joinAndSelect('teamSnapshot.originTeam', 'team')
    .joinAndSelect('team.workspace', 'workspace')
}
export function scopeUserAnswerQuestion(qb: QueryBuilder<any>): QueryBuilder<any> {
  return qb.leftJoinAndSelect('userStandup.answers', 'answers')
    .leftJoinAndSelect('answers.question', 'answersQuestion')
}
export function scopeTeamJoins(qb: QueryBuilder<Team>): QueryBuilder<Team> {
  return qb
    .joinAndSelect('team.users', 'users')
    .joinAndSelect('team.questions', 'questions')
    .leftJoinAndSelect('questions.options', 'options')
}

export function scopeTeamSnapshotJoins(qb: QueryBuilder<any>): QueryBuilder<any> {
  return qb
    .joinAndSelect('teamSnapshot.questions', 'questionSnapshot')
    .leftJoinAndSelect('questionSnapshot.options', 'optionSnapshot')
}

export function qbStandupJoins(qb: QueryBuilder<any>): QueryBuilder<any> {
  scopeTeamWorkspaceJoins(qb)
  qb.leftJoinAndSelect('standup.users', 'userStandup');
  return scopeUserAnswerQuestion(qb)
}