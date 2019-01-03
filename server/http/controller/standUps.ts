import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import StandUp from "../../model/StandUp";
import {Inject, Service} from "typedi";
import {Connection} from "typeorm";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";

@Service()
export class StandUpsAction implements IHttpAction {
  constructor(private connection: Connection, @Inject(CONFIG_TOKEN) private config: IAppConfig) {

  }
  async handle(req, res) {
    const session = req.session;
    const user = session.user;

    if (!session.user) {
      res.send('Access deny');
      return;
    }

    const standUpRepository = this.connection.getRepository(StandUp);
    const standUps = await standUpRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.team', 'team')
      .leftJoinAndSelect('team.users', 'user')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answersUser')
      .leftJoinAndSelect('answers.question', 'answersQuestion')
      .where('team.id = :teamID', {teamID: user.team_id})
      .getMany();

    const authLink = 'https://slack.com/oauth/authorize?&client_id=' + this.config.slackClientID + '&scope=bot,channels:read,team:read';


    const standUpList = [];
    for (let standUp of standUps) {
      //standUp = await standUpRepository.preload(standUp)
      const userAnswers = [];
      for (const u of standUp.team.users) {
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
      team: user.team_name,
      authLink: authLink,
      standUpList,
      activeMenu: 'reports'
    }))
  }
}
