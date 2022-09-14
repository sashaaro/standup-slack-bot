import {Injectable} from 'injection-js';
import {instanceToPlain} from "class-transformer";
import {em} from "../../services/providers";
import Standup from "../../entity/standup";
import {QueryFlag, QueryOrder} from "@mikro-orm/core";
import {authorized} from "../../decorator/authorized";
import {Team} from "../../entity";
import {TeamRepository} from "../../repository/team.repository";

@Injectable()
export class StandupController {
  @authorized
  async list (req, res) {
    const teamID = parseInt(req.params.id)

    let limit = parseInt(req.query.limit as string) || 5;
    if (limit < 1 || limit > 10) {
      limit = 5;
    }
    let page = parseInt(req.query.page as string) || 1;
    if (page < 1) {
      page = 1;
    }

    const offset = (page - 1) * limit

    const teamRepo: TeamRepository = em().getRepository(Team)
    const [standups, total] = await em().findAndCount(Standup, {
      team: {originTeam: teamRepo.getReference(teamID)}
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
      ] as any,
      orderBy: {startAt: QueryOrder.ASC} as any,// TODO , 'users.answers.createdAt': 1},
      fields: ['team'],
      flags: [QueryFlag.PAGINATE]
    })

    res.setHeader( 'X-Total', total)
    res.setHeader('Access-Control-Allow-Headers', 'x-total')
    res.setHeader('Content-Type', 'application/json');

    res.send(instanceToPlain(standups, {
      strategy: 'excludeAll',
      groups: ["view_standups"]
    }))
  }

}
