import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import StandUp from "../../model/StandUp";
import {Service} from "typedi";
import {Connection} from "typeorm";
import Team from "../../model/Team";
import {Channel} from "../../model/Channel";

@Service()
export class StandUpsAction implements IHttpAction {
  constructor(private connection: Connection) {

  }
  async handle(req, res) {
    const session = req.session;
    const user = session.user;

    if (!session.user) {
      res.send('Access deny');
      return;
    }

    const teamRepository = this.connection.getRepository(Team);

    let team = await teamRepository.findOne({where: {id: user.team_id}})
    if (!team) {
      // TODO 404
      throw new Error('team is not found');
    }

    const channelRepository = this.connection.getRepository(Channel);

    let channel: Channel;
    if (session.channel) {
      channel = await channelRepository.findOne(session.channel)
    }

    if (!channel) {
      return res.send(pug.compileFile(`${templateDirPath}/setChannel.pug`)({
        team: team,
      }))
    }

    const standUpRepository = this.connection.getRepository(StandUp);
    const standUps = await standUpRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.channel', 'channel')
      .leftJoinAndSelect('channel.users', 'user')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answersUser')
      .leftJoinAndSelect('answers.question', 'answersQuestion')
      .where('channel.id = :channelID', {channelID: channel.id})
      .getMany();

    const standUpList = [];
    for (let standUp of standUps) {
      //standUp = await standUpRepository.preload(standUp)
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
      activeMenu: 'reports'
    }))
  }
}
