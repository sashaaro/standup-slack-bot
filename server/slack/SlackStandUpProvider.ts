import {Service} from "typedi";
import {Observable, Observer, Subject} from "rxjs";
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
import {SlackChannel, SlackGroup} from "./model/SlackChannel";
import {Channel} from "../model/Channel";
import {
  InteractiveDialogSubmissionResponse,
  InteractiveResponse
} from "./model/InteractiveResponse";

const CALLBACK_PREFIX_STANDUP_INVITE = 'standup_invite'
const CALLBACK_PREFIX_SEND_STANDUP_ANSWERS = 'send_answers'

@Service()
export class SlackStandUpProvider implements IStandUpProvider, ITransport {
  private messagesSubject = new Subject<IMessage[]>();
  private agreeToStartSubject = new Subject<User>();

  message$: Observable<IMessage>;
  messages$ = this.messagesSubject.asObservable();
  agreeToStart$ = this.agreeToStartSubject.asObservable();

  private messageObserverFn = (observer) => {
    const userRepository = this.connection.getRepository(User);

    this.rtm.on('message.im', async (messageResponse: RTMMessageResponse) => {
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
  }

  constructor(
    public readonly rtm: slackClient.RTMClient,
    private webClient: slackClient.WebClient,
    private connection: Connection) {
  }

  async sendGreetingMessage(user: User) {
    await this.webClient.chat.postMessage({
      "channel": user.im,
      "text": "Hello, it's time to start your daily standup", // TODO  for *my_private_team*
      "attachments": [
        {
          "text": "Choose start asking in char or open dialog window",
          "callback_id": `${CALLBACK_PREFIX_STANDUP_INVITE}`,// save standup channel id if have multi standups
          "actions": [
            {
              "name": "start",
              "text": "Start",
              "type": "button",
              "value": "start"
            },
            {
              "name": "dialog",
              "text": "Open dialog",
              "type": "button",
              "value": "dialog"
            },
            // TODO I'm late?!
            /*{
              "name": "skip",
              "text": "I skip",
              "type": "button",
              "value": "skip",
              "style": "danger",
              "confirm": {
                "title": "Are you sure?",
                "text": "Wouldn't you prefer to skip standup today?",
                "ok_text": "Yes",
                "dismiss_text": "No"
              }
            }*/
          ]
        }
      ]
    })
  }

  async sendMessage(user: User, message: string): Promise<any> {
    return this.rtm.sendMessage(message, user.im);
  }

  async init(): Promise<any> {
    this.rtm.on('connected', () => {
      console.log('Slack RTM connected')
    });

    this.message$ = Observable.create(this.messageObserverFn.bind(this));

    const channelRepository = this.connection.getRepository(Channel);
    const joinSlackChannel = async (channel: SlackChannel) => {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel();
        ch.id = channel.id
      }

      ch.isArchived = channel.is_archived
      ch.isEnabled = true

      await channelRepository.save(ch);
    }

    const leftSlackChannel = async (channel: SlackChannel) => {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel();
        ch.id = channel.id
      }

      ch.isArchived = channel.is_archived
      ch.isEnabled = false

      await channelRepository.save(ch);
    }

    const archiveSlackChannel = async (channel: SlackChannel) => {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel();
        ch.id = channel.id
        ch.isEnabled = false
      }

      ch.isArchived = true

      await channelRepository.save(ch);
    }

    const unArchiveSlackChannel = async (channel: SlackChannel) => {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel();
        ch.id = channel.id
        ch.isEnabled = false
      }

      ch.isArchived = false

      await channelRepository.save(ch);
    }

    this.rtm.on('channel_joined', async (response) => {
      const channel = response.channel as SlackChannel
      await joinSlackChannel(channel)
    })

    this.rtm.on('group_joined', async (response) => {
      const channel = response.channel as SlackChannel
      await joinSlackChannel(channel)
    })

    this.rtm.on('channel_left', async (response) => {
      const channel = response.channel as SlackChannel
      await leftSlackChannel(channel)
    })

    this.rtm.on('group_left', async (response) => {
      const channel = response.channel as SlackChannel
      await leftSlackChannel(channel)
    })


    this.rtm.on('channel_archive', async (response) => {
      const channel = response.channel as SlackChannel
      await archiveSlackChannel(channel)
    })
    this.rtm.on('channel_unarchived', async (response) => {
      const channel = response.channel as SlackChannel
      await unArchiveSlackChannel(channel)
    })

    this.rtm.on('group_archive', async (response) => {
      const channel = response.channel as SlackChannel
      await archiveSlackChannel(channel)
    })
    this.rtm.on('group_unarchived', async (response) => {
      const channel = response.channel as SlackChannel
      await unArchiveSlackChannel(channel)
    })


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
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
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

  async findProgressByTeam(team: ITeam | Channel): Promise<StandUp> {
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
      .andWhere('st.end <= CURRENT_TIMESTAMP')
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
      .orderBy('st.start', "DESC")
      .getOne();
  }


  async findLastNoReplyAnswerRequest(standUp: StandUp, user: User): Promise<AnswerRequest> {
    const answerRepository = this.connection.getRepository(AnswerRequest);
    return await answerRepository.createQueryBuilder('a')
      .leftJoinAndSelect("a.user", "user")
      .leftJoinAndSelect("a.question", "question")
      .innerJoinAndSelect("a.standUp", "standUp")
      .innerJoinAndSelect("standUp.channel", "channel")
      .where('user.id = :userID', {userID: user.id})
      .andWhere('a.answerMessage IS NULL')
      .andWhere('standUp.id = :standUp', {standUp: standUp.id})
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
      .getOne()
  }

  async updateAnswer(lastNoReplyAnswer: AnswerRequest): Promise<AnswerRequest> {
    const answerRepository = this.connection.getRepository(AnswerRequest);

    return answerRepository.save(lastNoReplyAnswer);
  }

  async findStandUpsEndNowByDate(date: Date): Promise<StandUp[]> {
    return await this.connection.getRepository(StandUp).createQueryBuilder('st')
      .leftJoinAndSelect('st.channel', 'channel')
      .leftJoinAndSelect('channel.team', 'team')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'user')
      .leftJoinAndSelect('answers.question', 'question')
      .where('date_trunc(\'minute\', st.end) = date_trunc(\'minute\', CURRENT_TIMESTAMP)')
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
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

    let response = await this.webClient.channels.list();
    if (!response.ok) {
      throw new Error(response.error);
    }
    let channels = (response as any).channels as SlackChannel[]

    response = await this.webClient.groups.list();
    if (!response.ok) {
      throw new Error(response.error);
    }
    let privateChannel = ((response as any).groups as SlackGroup[])


    channels = channels.concat(privateChannel as any)
    const channelRepository = this.connection.getRepository(Channel)

    await this.connection.createQueryBuilder()
      .update(Channel)
      .where({team: team.id})
      .set({isArchived: true})
      .execute()

    for (const channel of channels) {
      // channel.is_channel
      let ch = await channelRepository.findOne(channel.id)
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
        ch.isEnabled = false;
      }

      ch.isArchived = channel.is_archived;
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


  async handleInteractiveResponse(response: InteractiveResponse) {
    if (response.callback_id.startsWith(CALLBACK_PREFIX_STANDUP_INVITE)) {

      const selectedActions = response.actions.map(a => a.value)
      if (selectedActions.includes("dialog")) {
        const openDialogRequest = {
          "trigger_id": response.trigger_id,
          //"token": this.webClient.token,
          "dialog": {
            "callback_id": `${CALLBACK_PREFIX_SEND_STANDUP_ANSWERS}`, // TODO multi standups
            "title": "Standup", // for my_privat...
            "submit_label": "Submit standup",
            "notify_on_cancel": true,
            "state": "Limo",
            "elements": []
          }
        }

        const questions = await this.connection.getRepository(Question)
          .createQueryBuilder('q')
          .orderBy('q.index', 'ASC')
          .getMany()

        for(const question of questions) {
          openDialogRequest.dialog.elements.push({
            "type": "text",
            "label": question.text.length > 24 ? question.text.slice(0, 21) + '...' : question.text,
            "placeholder": question.text,
            "name": question.index
          })
        }

        try {
          const result = await this.webClient.apiCall('dialog.open', openDialogRequest)
          console.log(result)
          //await this.rtm.send('dialog.open', openDialogRequest)
        } catch (e) {
          console.log(e.message)
          console.log(e.data.response_metadata.messages)
          throw new Error(e.message)
        }
      } else if (selectedActions.includes("start")) {
        const user = await this.connection.getRepository(User).findOne(response.user);

        if (!user) {
          throw new Error(`User ${response.user} is not found`)
        }

        this.agreeToStartSubject.next(user)
      } else {
        throw new Error("No corresponded actions")
      }

    } else {
      console.log(`There is no handler for callback ${response.callback_id}`);
    }
  }


  async handleInteractiveDialogSubmissionResponse(response: InteractiveDialogSubmissionResponse) {
    if (response.callback_id.startsWith(CALLBACK_PREFIX_SEND_STANDUP_ANSWERS)) {
      const user = await this.connection.getRepository(User).findOne(response.user);

      if (!user) {
        throw new Error(`User ${response.user} is not found`)
      }

      const channelTeam = user.team.channels.filter((channel) => (channel.id === response.channel.id)).pop()
      if (!user) {
        throw new Error(`Channel team ${response.channel.id} is not found`)
      }

      const messages: IMessage[] = []
      for (const index of Object.keys(response.submission).sort((current, next) => current > next ? 1 : -1)) {
        const text = response.submission[index]
        messages.push({
          team: channelTeam,
          text: text,
          user: user
        } as IMessage)
      }

      this.messagesSubject.next(messages)
    } else {
      console.log(`There is no handler for callback ${response.callback_id}`);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}