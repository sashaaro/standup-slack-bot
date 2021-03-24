import Standup from "../../model/Standup";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError} from "../ApiMiddleware";
import {IHttpAction} from "./index";
import {groupBy, groupByData} from "../../services/utils";
import {serialize} from "class-transformer";

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


    const standupRepository = this.connection.getRepository(Standup);

    const qb = standupRepository
      .createQueryBuilder('standup')
      .innerJoinAndSelect('standup.team', 'teamSnapshot')
      .innerJoinAndSelect('teamSnapshot.questions', 'questionsSnapshot')
      .innerJoinAndSelect('questionsSnapshot.options', 'optionsSnapshot')
      .innerJoinAndSelect('standup.users', 'userStandups')
      .innerJoinAndSelect('userStandups.user', 'user')
      .innerJoinAndSelect('userStandups.answers', 'answers')
      .innerJoinAndSelect('answers.question', 'answersQuestion')
      .leftJoinAndSelect('answers.option', 'answersOption')
      .andWhere('teamSnapshot.originTeamId = :teamID', {teamID})

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

    qb.skip(offset)
    qb.take(limit)

    res.setHeader( 'X-Total', total)
    res.setHeader('Access-Control-Allow-Headers', 'x-total')
    res.setHeader('Content-Type', 'application/json');

    const standups = await qb.getMany()

    res.send(serialize(standups));
  }

}
