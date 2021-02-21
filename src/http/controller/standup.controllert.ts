import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError} from "../apiExpressMiddleware";
import {IHttpAction} from "./index";

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

    const id = req.params.id


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
      .andWhere('team.id = :teamID', {teamID: id})

    const recordsPerPage = 3
    const page = parseInt(req.query.page as string) || 1;

    const standUpsTotal = await qb.getCount();

    const standUps = await qb
      .skip((page - 1) * recordsPerPage) // use offset method?!
      .take(recordsPerPage) // use limit method?!
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

    const pageCount = Math.ceil(standUpsTotal / recordsPerPage)

    res.send({
      //standUpList,
      standUps,
      pageCount
    });
  }

}
