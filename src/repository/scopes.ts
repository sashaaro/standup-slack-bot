// with channel channelUsers questions answers answerAuthor
import {Brackets, SelectQueryBuilder} from "typeorm";
import {Team} from "../model/Team";
import StandUp from "../model/StandUp";
import User from "../model/User";

export function scopeTeamJoins(qb: SelectQueryBuilder<Team>): SelectQueryBuilder<Team> {
  return qb
    .innerJoinAndSelect('team.users', 'users') // TODO remove
    .innerJoinAndSelect('team.questions', 'questions')
    .leftJoinAndSelect('questions.options', 'options')
}

export function qbStandUpJoins(qb: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
  return qb.leftJoinAndSelect('standup.users', 'userStandup')
    .leftJoinAndSelect('userStandup.answers', 'answers')
    .leftJoinAndSelect('answers.question', 'answersQuestion')
    .innerJoinAndSelect('standup.team', 'teamSnapshot')
    .innerJoinAndSelect('teamSnapshot.originTeam', 'team')
    .innerJoinAndSelect('team.workspace', 'workspace')
  ;
}