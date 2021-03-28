import {Injectable} from 'injection-js';
import {AccessDenyError} from "../ApiMiddleware";
import {IHttpAction} from "./index";
import {serialize} from "class-transformer";
import {em} from "../../services/providers";
import Standup from "../../entity/standup";
import {QueryFlag} from "@mikro-orm/core";

@Injectable()
export class StandupController {
  list: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const teamID = req.params.id

    let limit = parseInt(req.query.limit as string) || 5;
    if (limit < 1 || limit > 10) {
      limit = 5;
    }
    let page = parseInt(req.query.page as string) || 1;
    if (page < 1) {
      page = 1;
    }

    const total = 10//await qb.count('standup.id', true).execute()

    const offset = (page - 1) * limit

    const qb = em().createQueryBuilder(Standup, 'standup')
    qb.select('*')
    qb
      .limit(limit, offset)
      .setFlag(QueryFlag.PAGINATE)

    qb
      .joinAndSelect('standup.team', 'teamSnapshot')
      //.joinAndSelect('teamSnapshot.questions', 'questionsSnapshot')
      //.joinAndSelect('questionsSnapshot.options', 'optionsSnapshot')
      //.joinAndSelect('standup.users', 'userStandups')
      //.joinAndSelect('userStandups.user', 'user')
      //.joinAndSelect('userStandups.answers', 'answers')
      //.joinAndSelect('answers.question', 'answersQuestion')
      //.leftJoinAndSelect('answers.option', 'answersOption')
      //.andWhere('teamSnapshot.originTeamId = ?', [teamID])

    // res.setHeader( 'X-Total', total)
    // res.setHeader('Access-Control-Allow-Headers', 'x-total')
    // res.setHeader('Content-Type', 'application/json');

    // res.send([]);
    // return;
console.log(111);
    res.send(
      //'111'
      qb.getQuery()
    )
    return;
    //const standups = await qb.getResultList()

    //res.send(serialize(standups));
    res.send([]);
  }

}
