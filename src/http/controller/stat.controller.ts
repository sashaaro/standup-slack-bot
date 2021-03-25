import {Injectable, Inject} from 'injection-js';
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";

@Injectable()
export class StatController {
  constructor() {}

  @bind
  @authorized
  async options(req: Request, res: Response) {
    const questionId = req.params.questionId

    const connection = {} as any // TODO mikroorm
    const stat = await connection.query(`SELECT st."startAt", qo.id, qo.text, COUNT(*) FROM answer_request
INNER JOIN question_option_snapshot qos on qos.id = answer_request."optionId"
INNER JOIN question_option qo on qo.id = qos."originOptionId"
INNER JOIN stand_up st on answer_request."standupId" = st.id
WHERE answer_request."optionId" IS NOT NULL AND qo."questionId" = $1
group by st."startAt", qo.id`, [questionId])

    res.send(stat);
  }
}
