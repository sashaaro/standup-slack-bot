import {Service} from "typedi";
import {Observable} from "rxjs";
import * as slackClient from "@slack/client";
import {Connection} from "typeorm";
import User from "../model/User";
import {RTMMessageResponse} from "./model/rtm/RTMMessageResponse";
import Team from "../model/Team";
import {RTMAuthenticatedResponse, SlackIm} from "./model/rtm/RTMAuthenticatedResponse";
import {SlackMember} from "./model/SlackUser";
import StandUp from "../model/StandUp";
import Answer from "../model/Answer";
import Question from "../model/Question";
import {IMessage, IStandUpProvider, ITeam, ITeamProvider, ITransport} from "../StandUpBotService";

@Service()
export class SlackProvider implements IStandUpProvider, ITeamProvider, ITransport {
  message$: Observable<IMessage>;

  constructor(
    private rtm: slackClient.RTMClient,
    private webClient: slackClient.WebClient,
    private connection: Connection) {
  }

  sendMessage(user: User, message: string): Promise<any> {
    return this.rtm.sendMessage(message, user.im);
  }


  async init(): Promise<any> {
    const userRepository = this.connection.getRepository(User);

    this.rtm.on('connected', () => {
      console.log('Connection opened')
    });

    this.message$ = Observable.create((observer) => {
      this.rtm.on('message', async (messageResponse: RTMMessageResponse) => {
        // be sure it is direct message to bot
        if (!userRepository.findOne({where: {im: messageResponse.channel}})) {
          console.log(`User channel ${messageResponse.channel} is not im`);
          // TODO try update from api
          return
        }

        const message = {
          team: await this.connection.getRepository(Team).findOne(messageResponse.team),
          text: messageResponse.text,
          user: await this.connection.getRepository(User).findOne(messageResponse.user)
        } as IMessage;

        observer.next(message)
      })


      this.rtm.on('error', async (message) => {
        console.log(message)
        observer.complete();
      });
    });

    this.rtm.on('authenticated', async (rtmStartData: RTMAuthenticatedResponse) => {
      console.log(`Authenticated to team "${rtmStartData.team.name}"`);
      console.log(rtmStartData);

      const teamRepository = this.connection.getRepository(Team);
      let teamModel = await teamRepository.findOne(rtmStartData.team.id);
      if (!teamModel) {
        teamModel = new Team();
        teamModel.id = rtmStartData.team.id
      }

      await teamRepository.save(teamModel);
      await this.loadUsers();
    })

    await this.rtm.start();
    return;
  }

  all(): Promise<Team[]> {
    return this.connection.getRepository(Team)
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.users', 'users')
      .getMany();
  }

  createStandUp(): StandUp {
    return new StandUp();
  }

  createAnswer(): Answer {
    return new Answer();
  }

  insertAnswer(answer: Answer): Promise<any> {
    return this.connection.getRepository(Answer).insert(answer)
  }

  insert(standUp: StandUp): Promise<any> {
    const standUpRepository = this.connection.getRepository(StandUp);

    return standUpRepository.insert(standUp)
  }

  async findProgressByTeam(team: ITeam): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    return await standUpRepository.createQueryBuilder('st')
      .where('st.team = :team', {team: team.id})
      // .andWhere('st.end IS NULL')
      .orderBy('st.start', "DESC")
      .getOne();
  }

  async findLastNoReplyAnswer(standUp: StandUp, user: User): Promise<Answer> {
    const answerRepository = this.connection.getRepository(Answer);
    return await answerRepository.createQueryBuilder('a')
      .leftJoinAndSelect("a.user", "user")
      .leftJoinAndSelect("a.question", "question")
      .innerJoinAndSelect("a.standUp", "standUp")
      .where('user.id = :userID', {userID: user.id})
      .andWhere('a.message IS NULL')
      .andWhere('standUp.id = :standUp', {standUp: standUp.id})
      .getOne()
  }

  async updateAnswer(lastNoReplyAnswer: Answer): Promise<Answer> {
    const answerRepository = this.connection.getRepository(Answer);

    return answerRepository.save(lastNoReplyAnswer);
  }


  async endedByDate(date: Date): Promise<StandUp[]> {
    const standUpRepository = this.connection.getRepository(StandUp);

    //now.setSeconds(0)
    //now.setMilliseconds(0)
    return standUpRepository.createQueryBuilder('st')
      .where('TO_CHAR(st.end, \'YYYY-MM-DD HH24:MI\') = TO_CHAR(NOW()::timestamp at time zone \'Europe/Moscow\', \'YYYY-MM-DD HH24:MI\')')
      .getMany()
  }

  getQuestion(team: ITeam, index): Promise<Question> {
    return this.connection.getRepository(Question).findOne({
      where: {
        index: index,
        team: team
      }
    })
  }


  private async loadUsers() {
    const userRepository = this.connection.getRepository(User);
    const teamRepository = this.connection.getRepository(Team);

    const usersResult = await this.webClient.users.list();
    if (!usersResult.ok) {
      // throw..
      return;
    }

    const ims = <SlackIm[]>(await this.webClient.im.list() as any).ims;
    const members = <SlackMember[]>(usersResult as any).members;


    for (const member of members.filter(u => !u.is_bot && !u.deleted)) {
      let user = await userRepository.findOne(member.id);
      if (!user) {
        user = new User();
        user.id = member.id
      }
      user.name = member.name;
      user.profile = member.profile;
      user.team = await teamRepository.findOne(member.team_id);

      const im = ims.filter(im => (im.user === user.id && !im.is_user_deleted)).pop();

      if (!im) {
        console.log('im not found');
        continue;
      }

      user.im = im.id;

      await userRepository.save(user)
    }
  }
}
