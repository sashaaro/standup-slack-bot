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
import AnswerRequest from "../model/AnswerRequest";
import Question from "../model/Question";
import {IMessage, IStandUpProvider, ITeam, ITransport, IUser} from "../StandUpBotService";
import {SlackChannel} from "./model/SlackChannel";
import {Channel} from "../model/Channel";

@Service()
export class SlackStandUpProvider implements IStandUpProvider, ITransport {
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
      console.log('Slack RTM connected')
    });

    this.message$ = Observable.create((observer) => {
      this.rtm.on('message', async (messageResponse: RTMMessageResponse) => {
        // be sure it is direct answerMessage to bot
        if (!userRepository.findOne({where: {im: messageResponse.channel}})) {
          console.log(`User channel ${messageResponse.channel} is not im`);
          // TODO try update from api
          return
        }

        const message = {
          //team: await this.connection.getRepository(Channel).findOne(messageResponse.channel),
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

      const teamRepository = this.connection.getRepository(Team);
      let team = await teamRepository.findOne(rtmStartData.team.id);
      if (!team) {
        team = new Team();
        team.id = rtmStartData.team.id
      }
      team.name = rtmStartData.team.name
      team.domain = rtmStartData.team.domain

      await teamRepository.save(team);
      await this.updateData(team);
    })

    await this.rtm.start();
    return;
  }

  findTeams(): Promise<Channel[]> {
    return this.connection.getRepository(Channel)
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.users', 'users')
      .getMany();
  }

  createStandUp(): StandUp {
    return new StandUp();
  }

  createAnswer(): AnswerRequest {
    return new AnswerRequest();
  }

  insertAnswer(answer: AnswerRequest): Promise<any> {
    return this.connection.getRepository(AnswerRequest).insert(answer)
  }

  insertStandUp(standUp: StandUp): Promise<any> {
    const standUpRepository = this.connection.getRepository(StandUp);

    return standUpRepository.insert(standUp)
  }

  async findProgressByTeam(team: ITeam|Channel): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    return await standUpRepository.createQueryBuilder('st')
      .where('st.channel = :channel', {channel: team.id})
      // .andWhere('st.end IS NULL')
      .orderBy('st.start', "DESC")
      .getOne();
  }

  async findProgressByUser(user: IUser): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    return await standUpRepository.createQueryBuilder('st')
      .innerJoinAndSelect('st.channel', 'channel')
      .innerJoinAndSelect('channel.users', 'users')
      .where('users.id = :user', {user: user.id})
      // TODO if.. .andWhere('st.end lt now')
      .orderBy('st.start', "DESC")
      .getOne();
  }



  async findLastNoReplyAnswerRequest(standUp: StandUp, user: User): Promise<AnswerRequest> {
    const answerRepository = this.connection.getRepository(AnswerRequest);
    return await answerRepository.createQueryBuilder('a')
      .leftJoinAndSelect("a.user", "user")
      .leftJoinAndSelect("a.question", "question")
      .innerJoinAndSelect("a.standUp", "standUp")
      .where('user.id = :userID', {userID: user.id})
      .andWhere('a.answerMessage IS NULL')
      .andWhere('standUp.id = :standUp', {standUp: standUp.id})
      .getOne()
  }

  async updateAnswer(lastNoReplyAnswer: AnswerRequest): Promise<AnswerRequest> {
    const answerRepository = this.connection.getRepository(AnswerRequest);

    return answerRepository.save(lastNoReplyAnswer);
  }

  async findStandUpsEndNowByDate(date: Date): Promise<StandUp[]> {
    return await this.connection.getRepository(StandUp).createQueryBuilder('st')
      .where('date_trunc(\'minute\', st.end) = date_trunc(\'minute\', NOW()::timestamp)')
      //.leftJoinAndSelect('st.channel', 'channel')
      //.leftJoinAndSelect('channel.team', 'team')
      //.leftJoinAndSelect('st.answers', 'answers')
      //.leftJoinAndSelect('answers.user', 'user')
      //.leftJoinAndSelect('answers.question', 'question')
      .getMany()
  }

  findOneQuestion(team: ITeam, index): Promise<Question> {
    return this.connection.getRepository(Question).findOne({
      where: {
        index: index,
        team: team
      }
    })
  }

  async updateData(team: Team) {
    await this.updateUsers(team)
    await this.updateChannels(team)
  }

  private async updateUsers(team: Team) {
    const userRepository = this.connection.getRepository(User);

    const usersResult = await this.webClient.users.list();
    if (!usersResult.ok) {
      // throw..
      console.log(usersResult.error)
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

      if (member.team_id !== team.id) {
        throw new Error(`Team #${team.id} is not equal to member.team_id as ${member.team_id}`)
      }

      user.team = team //await teamRepository.findOne(member.team_id);

      const im = ims.filter(im => (im.user === user.id && !im.is_user_deleted)).pop();

      if (!im) {
        console.log('im not found');
        continue;
      }

      user.im = im.id;

      await userRepository.save(user)
    }
  }

  private async updateChannels(team: Team) {
    const userRepository = this.connection.getRepository(User);

    const response = await this.webClient.channels.list();
    if (!response.ok) {
      throw new Error(response.error);
    }
    const channels = (response as any).channels as SlackChannel[]

    const channelRepository = this.connection.getRepository(Channel)

    await this.connection.createQueryBuilder()
      .update(Channel)
      .where({team: team.id})
      .set({isActive: false})
      .execute()

    for(const channel of channels.filter((channel) => !channel.is_general && !channel.is_archived && channel.is_channel)) {
      let ch = await channelRepository.findOne(channel.id)
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
      }

      ch.isActive = true;
      ch.createdBy = await userRepository.findOne(channel.creator)
      if (!ch.createdBy) {
        console.log('Created by is not found')
        continue;
      }
      ch.team = team
      if (!ch.team) {
        console.log('Created by is not found')
        continue;
      }

      ch.name = channel.name
      ch.nameNormalized = channel.name_normalized
      await channelRepository.save(ch);

      ch.users = await userRepository.createQueryBuilder('u').whereInIds(channel.members).getMany()
      await channelRepository.save(ch);
    }
  }
}
