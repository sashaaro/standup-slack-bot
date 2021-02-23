import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError} from "../apiExpressMiddleware";
import {IHttpAction} from "./index";
import {groupBy} from "../../services/utils";

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
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.team', 'team')
      .leftJoinAndSelect('team.users', 'user')
      .leftJoinAndSelect('user.answers', 'userAnswer')
      .leftJoinAndSelect('userAnswer.question', 'answersQuestion')
      .leftJoinAndSelect('userAnswer.option', 'answersOption')
      .leftJoinAndSelect('answersQuestion.options', 'questionOptions')
      .orderBy('st.endAt', 'DESC')
      .andWhere('st.endAt IS NOT NULL')
      .andWhere('userAnswer.standUp = st.id')
      //.andWhere('team.id = :teamID', {teamID})

    let limit = parseInt(req.query.limit as string) || 3;
    if (limit > 10) {
      limit = 10;
    }
    const page = parseInt(req.query.page as string) || 1;

    const total = await qb.getCount();

    const offset = (page - 1) * limit
    const standUps = await qb
      .skip(offset) // use offset method?!
      .take(limit) // use limit method?!
      .getMany();


    /*const standUpList = [];
    for (let standUp of standUps) {
      const userAnswers = [];
      for (const u of standUp.team.users) {
        for (const answer of standUp.answers as any) {
          if (answer.answerMessage) {
            answer.formatAnswerMessage = await formatMsg(context.user.team, userRepository, answer.answerMessage)
          }
        }

        userAnswers.push({
          user: u,
          answers: standUp.answers.filter(ans => ans.user.id === u.id)
        })
      }

      standUpList.push({
        standUp: standUp,
        answers: userAnswers,
        isInProgress: isInProgress(standUp)
      })
    }*/

    const data: {
      id: number,
      startAt: string,
      endAt: string,
      userId: string,
      userName: string,
      userImage: string,
      questionId: number,
      questionText: string
      optionText?: string
      answer?: string
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
   "question_option".text as "optionText",
   "answer_request"."answerMessage" as answer
FROM (SELECT * FROM stand_up) as stand_up
        LEFT JOIN answer_request ON answer_request."standUpId" = stand_up.id
        INNER JOIN question ON question.id = answer_request."questionId"
        LEFT JOIN question_option ON question_option.id = answer_request."optionId"
        INNER JOIN "user" ON "user".id = answer_request."userId"`, [
          //teamID, offset, limit
      ]);
//WHERE stand_up."teamId" = $1 OFFSET $2 LIMIT $3
    const standups = groupBy(data, i => i.id)

    const items: {
      "id": 1,
      "startAt": "2021-01-25T10:26:00.014Z",
      "endAt": "2021-01-25T10:30:00.014Z",
      "users": {
        "id": "UJZM51SN8",
        "name": "sashaaro",
        "image": "https://a.slack-edge.com/80588/img/slackbot_48.png",
        "questions": {
          "id": 3,
          "text": "Are you working at office today?",
          "option": null,
          "answer": null
        }[]
      }
    }[] = [];
    for(const standUpId in standups) {
      const standup = standups[standUpId];
      const item: Partial<StandUp>|any = {
        id: standup[0]?.id,
        startAt: standup[0]?.startAt,
        endAt: standup[0]?.endAt,
        users: []
      };
      standup.forEach(i => {
        delete i.id
        delete i.startAt
        delete i.endAt
      })

      const users = groupBy(standup, i => i.userId)

      for(const userId in users) {
        const questions = users[userId];
        const uItem = {
          id: questions[0]?.userId,
          name: questions[0]?.userName,
          image: questions[0]?.userImage,
          questions: []
        }
        item.users.push(uItem)
        questions.forEach(i => {
          delete i.userId
          delete i.userName
          delete i.userImage
        })
        uItem.questions = questions.map(q => ({
          id: q.questionId,
          text: q.questionText,
          option: q.optionText,
          answer: q.answer
        }))
      }

      items.push(item)
    }


    res.setHeader( 'X-Total', total)
    res.setHeader('Access-Control-Allow-Headers', 'x-total')

    res.send(items); // TODO hide accessToken!!
  }

}
