import {Injectable} from 'injection-js';
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";
import {em} from "../../services/providers";

@Injectable()
export class StatController {
  constructor() {}

  @bind
  @authorized
  async options(req: Request, res: Response) {
    const questionId = req.params.questionId

    const stat = await em().execute(`SELECT st."start_at", qo.id, qo.text, COUNT(*) FROM question_option qo
INNER JOIN question_option_snapshot qos on qos.id = answer_request."option_id"
INNER JOIN user_standup_id ust on answer_request."user_standup_id" = st.id
INNER JOIN answer_request st on answer_request."user_standup_id" = st.id
WHERE answer_request."option_id" IS NOT NULL AND qo."question_id" = $1
group by st."start_at", qo.id`, [questionId])

    res.send(stat);
  }
}
