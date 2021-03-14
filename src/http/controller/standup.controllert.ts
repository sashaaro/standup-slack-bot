import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError} from "../ApiMiddleware";
import {IHttpAction} from "./index";
import {groupBy, groupByData} from "../../services/utils";

interface IStandupView {
  id: number,
  startAt: Date,
  endAt: Date,
  users: {
    id: string,
    name: string,
    image: string,
    questions: {
      id: 3,
      text: "Are you working at office today?",
      answerOptionId?: string,
      answerMessage?: string
      options: {
        optionId: string
        optionText: string
        optionIndex: number
      }[]
    }[]
  }
}

@Injectable()
export class StandupController {
  constructor(
    private connection: Connection,
  ) {
  }

  list: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const teamID = req.params.id


    const standUpRepository = this.connection.getRepository(StandUp);

    const qb = standUpRepository
      .createQueryBuilder('standup')
      .innerJoinAndSelect('standup.team', 'teamSnapshot')
      .innerJoinAndSelect('teamSnapshot.originTeam', 'team')
      .andWhere('team.id = :teamID', {teamID})

    let limit = parseInt(req.query.limit as string) || 5;
    if (limit < 1 || limit > 10) {
      limit = 5;
    }
    let page = parseInt(req.query.page as string) || 1;
    if (page < 1) {
      page = 1;
    }
    const total = await qb.getCount();
    const offset = (page - 1) * limit

    const data: {
      id: number
      startAt: string
      endAt: string
      userId: string
      userName: string
      userImage: string
      questionId: number
      questionText: string
      answerOptionId?: string
      answerMessage?: string
      optionId?: string
      optionText?: string
    }[] = await this.connection.query(
      `SELECT
   stand_up.id,
   stand_up."startAt",
   stand_up."endAt",
   "user".id as "userId",
   "user".name as "userName",
   "user".profile->'image_48' as "userImage",
   "question".id as "questionId",
   "question".text as "questionText",
   "question_option"."id" as "optionId",
   "question_option".text as "optionText",
   "answer_request"."answerMessage" as "answerMessage",
   "answer_request"."optionId" as "answerOptionId"
FROM (SELECT stand_up.* FROM stand_up
INNER JOIN team_snapshot ON stand_up."teamId" = team_snapshot.id
INNER JOIN team ON team.id = team_snapshot."originTeamId"
WHERE team.id = $1 OFFSET $2 LIMIT $3) as stand_up
  LEFT JOIN answer_request ON answer_request."standUpId" = stand_up.id
  INNER JOIN question_snapshot question ON question.id = answer_request."questionId"
  LEFT JOIN question_option_snapshot question_option ON question_option."questionId" = question.id
  INNER JOIN "user" ON "user".id = answer_request."userId"
`, [teamID, offset, limit]);
    let grouped: IStandupView[] | any = groupByData(data, {
      groupBy: 'id',
      groupProps: ['startAt', 'endAt'],
      listProp: 'users'
    })
    grouped = grouped.map(group => {
      group.users = groupByData(group.users, {
        groupBy: 'userId',
        groupProps: ['userName', 'userImage'],
        listProp: 'questions'
      })

      group.users.forEach(u => {
        u.questions = groupByData(u.questions, {
          groupBy: 'questionId',
          groupProps: ['id', 'questionText', 'answerOptionId', 'answerMessage'],
          listProp: 'options'
        })
      })

      return group;
    })

    res.setHeader( 'X-Total', total)
    res.setHeader('Access-Control-Allow-Headers', 'x-total')

    res.send(grouped);

    //
    // for(const standUpId in standups) {
    //   const standup = standups[standUpId];
    //   const item: Partial<StandUp>|any = {
    //     id: standup[0]?.id,
    //     startAt: standup[0]?.startAt,
    //     endAt: standup[0]?.endAt,
    //     users: []
    //   };
    //   standup.forEach(i => {
    //     delete i.id
    //     delete i.startAt
    //     delete i.endAt
    //   })
    //
    //   const users = groupBy(standup, i => i.userId)
    //
    //   for(const userId in users) {
    //     const questions = users[userId];
    //     const uItem = {
    //       id: questions[0]?.userId,
    //       name: questions[0]?.userName,
    //       image: questions[0]?.userImage,
    //       questions: []
    //     }
    //     item.users.push(uItem)
    //     questions.forEach(i => {
    //       delete i.userId
    //       delete i.userName
    //       delete i.userImage
    //     })
    //
    //
    //     uItem.questions = questions.map(q => ({
    //       id: q.questionId,
    //       text: q.questionText,
    //       option: q.optionText,
    //       answer: q.answer
    //     }))
    //   }
    //
    //   items.push(item)
    // }
    //
    //
    // res.setHeader( 'X-Total', total)
    // res.setHeader('Access-Control-Allow-Headers', 'x-total')
    //
    // res.send(items); // TODO hide accessToken!!
  }

}
