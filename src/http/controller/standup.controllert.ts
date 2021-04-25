import {Injectable} from 'injection-js';
import {AccessDenyError} from "../api.middleware";
import {IHttpAction} from "./index";
import {serialize} from "class-transformer";
import {em} from "../../services/providers";
import Standup from "../../entity/standup";
import {QueryFlag} from "@mikro-orm/core";
import {Team} from "../../entity";

@Injectable()
export class StandupController {
  list: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const teamID = parseInt(req.params.id)

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

    const standups = await em().find(Standup, {
      team: {originTeam: teamID}
    }, {
      limit,
      offset,
      populate: [
        'team',
        'team.originTeam',
        'team.questions',
        'team.questions.options',
        'users',
        'users.user',
        'users.answers',
      ],
      orderBy: {startAt: -1},
      //fields: ['team'],
      flags: [QueryFlag.PAGINATE]
    })

    res.send(serialize(standups, {
      strategy: 'excludeAll',
      groups: ["view_standups"]
    }))
    return;

    //qb.select('*')
    const qb = {} as any
    qb
      .limit(limit, offset)
      .setFlag(QueryFlag.PAGINATE)

    qb
      //.joinAndSelect('standup.team', 'teamSnapshot')
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
console.log(qb.getQuery());
    res.send(

      qb.getQuery()
    )
    return;
    //const standups = await qb.getResultList()

    //res.send(serialize(standups));
    res.send([]);
  }

}
