import {IHttpAction} from "./index";
import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import AuthorizationContext from "../../services/AuthorizationContext";
import {RENDER_TOKEN} from "../../services/token";
import {AccessDenyError} from "../dashboardExpressMiddleware";
import {isInProgress} from "../../slack/SlackTransport";

@Injectable()
export class StandUpsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(RENDER_TOKEN) private render: Function
  ) {

  }
  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser()

    if (!user) {
      throw new AccessDenyError();
    }

    const globalParams = await context.getGlobalParams()
    const {team, channel} = globalParams


    if (!team) {
      // TODO 404
      throw new Error('team is not found');
    }

    if (!channel) {
      res.send(this.render('editChannel', globalParams));
      return;
    }

    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.channel', 'channel')
      .leftJoinAndSelect('channel.users', 'user')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answersUser')
      .leftJoinAndSelect('answers.question', 'answersQuestion')
      .orderBy('st.end', 'DESC')
      //.andWhere('st.end <= CURRENT_TIMESTAMP')
      .where('channel.id = :channelID', {channelID: channel.id})

    const recordsPerPage = 5
    const page = parseInt(req.query.page) || 1;

    const standUpsTotal = await qb.getCount();

    const standUps = await qb
      .skip((page - 1) * recordsPerPage) // use offset method?!
      .take(recordsPerPage) // use limit method?!
      .getMany();

    const standUpList = [];
    for (let standUp of standUps) {
      const userAnswers = [];
      for (const u of standUp.channel.users) {
        userAnswers.push({
          user: u,
          answers: standUp.answers.filter(ans => ans.user.id === u.id)
        })
      }

      standUpList.push({
        standUp: standUp,
        answers: userAnswers
      })
    }

    const pageCount = Math.ceil(standUpsTotal / recordsPerPage)

    res.send(this.render('standUps', Object.assign({
      standUpList,
      activeMenu: 'reports',
      pageCount,
      isInProgress
    }, globalParams)));
  }
}
