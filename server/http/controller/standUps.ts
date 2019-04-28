import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import StandUp from "../../model/StandUp";
import { ReflectiveInjector, Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import Team from "../../model/Team";
import AuthorizationContext from "../../services/AuthorizationContext";

@Injectable()
export class StandUpsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    private authorizationContext: AuthorizationContext
  ) {

  }
  async handle(req, res) {
    const user = this.authorizationContext.getUser(req);

    if (!user) {
      res.send('Access deny');
      return;
    }

    const teamRepository = this.connection.getRepository(Team);

    let team = await teamRepository.findOne({where: {id: user.team_id}})
    if (!team) {
      // TODO 404
      throw new Error('team is not found');
    }

    const channel = await this.authorizationContext.getSelectedChannel(req);

    if (!channel) {
      return res.send(pug.compileFile(`${templateDirPath}/setChannel.pug`)({
        team: team,
      }))
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

    const recordsPerPage = 10
    const standUps = await qb
      .skip(0)
      .limit(recordsPerPage)
      .getMany();

    const standUpsTotal = await qb.getCount();

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

    res.send(pug.compileFile(`${templateDirPath}/standUps.pug`)({
      team,
      channel,
      standUpList,
      activeMenu: 'reports',
      standUpsTotal,
      recordsPerPage
    }))
  }
}
