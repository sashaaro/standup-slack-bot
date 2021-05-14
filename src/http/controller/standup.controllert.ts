import {Injectable} from 'injection-js';
import {serialize} from "class-transformer";
import {em} from "../../services/providers";
import Standup from "../../entity/standup";
import {QueryFlag} from "@mikro-orm/core";
import {Handler} from "express";
import {authorized} from "../../decorator/authorized";

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

    const [standups, total] = await em().findAndCount(Standup, {
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

    res.setHeader( 'X-Total', total)
    res.setHeader('Access-Control-Allow-Headers', 'x-total')
    res.setHeader('Content-Type', 'application/json');

    res.send(serialize(standups, {
      strategy: 'excludeAll',
      groups: ["view_standups"]
    }))
  }

}
