import { ReflectiveInjector, Injectable, Inject } from 'injection-js';
import {Observable, Subject} from "rxjs";
import {RTMClient} from '@slack/rtm-api'
import {WebClient} from '@slack/web-api'
import {Connection, SelectQueryBuilder} from "typeorm";
import User from "../model/User";
import {RTMMessageResponse} from "./model/rtm/RTMMessageResponse";
import Team from "../model/Team";
import {RTMAuthenticatedResponse, SlackIm} from "./model/rtm/RTMAuthenticatedResponse";
import StandUp from "../model/StandUp";
import AnswerRequest from "../model/AnswerRequest";
import Question from "../model/Question";
import {SlackChannel, SlackConversation} from "./model/SlackChannel";
import {Channel} from "../model/Channel";
import {
  InteractiveDialogSubmissionResponse,
  InteractiveResponse
} from "./model/InteractiveResponse";
import {logError} from "../services/logError";
import {IUsersResponse} from "./model/response";
import ChannelRepository from "../repository/ChannelRepository";
import QuestionRepository from "../repository/QuestionRepository";
import * as groupBy from "lodash.groupby";
import {IMessage, IStandUp, IStandUpProvider, ITransport, IUser} from "../bot/models";

export const CALLBACK_PREFIX_STANDUP_INVITE = 'standup_invite'
export const CALLBACK_PREFIX_SEND_STANDUP_ANSWERS = 'send_answers'

export const ACTION_START = 'start'
export const ACTION_OPEN_DIALOG = 'dialog'

const standUpFinishedAlreadyMsg =`Stand up has already ended\nI will remind you when your next standup is up`; // TODO link to report

@Injectable()
export class SlackStandUpProvider implements IStandUpProvider, ITransport {
  private messagesSubject = new Subject<IMessage[]>();
  private agreeToStartSubject = new Subject<User>();

  message$: Observable<IMessage>;
  messages$ = this.messagesSubject.asObservable();
  agreeToStart$ = this.agreeToStartSubject.asObservable();

  constructor(
    public readonly rtm: RTMClient,
    private readonly webClient: WebClient,
    private connection: Connection) {
  }

  async sendGreetingMessage(user: User, standUp: StandUp) {
    const callbackId = `${CALLBACK_PREFIX_STANDUP_INVITE}.${standUp.id}`;

    const buttonsAttachment: any = {
      "text": "Choose start poll in chat or open dialog window",
      "callback_id": callbackId,
      "actions": [
        {
          "name": "start",
          "text": "Start",
          "type": "button",
          "value": ACTION_START
        },
        {
          "name": "dialog",
          "text": "Open dialog",
          "type": "button",
          "value": ACTION_OPEN_DIALOG
        }
      ]
    }
    // TODO I'm late?!
    /*attachmentBtns.actions.push(
      {
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
      })*/

    const result = await this.webClient.chat.postMessage({
      "channel": user.im,
      "text": "Hello, it's time to start your daily standup", // TODO  for *my_private_team*
      "attachments": [buttonsAttachment]
    })

    // result.response_metadata.
  }

  async sendMessage(user: User, message: string): Promise<any> {
    return this.rtm.sendMessage(message, user.im);
  }

  async sendReport(standUp: StandUp)
  {
      /*if (!standUp instanceof StandUp) {
        console.log('Slack reporter is not supported')
        return;
      }*/
      const attachments = []

      const userAnswers = groupBy(standUp.answers, 'user.id')
      for(const userID in userAnswers) {
        const answers: AnswerRequest[] = userAnswers[userID]
        if (answers.length === 0) {
          // TODO skip message
          continue;
        }

        const text = answers
          .map(a => `*${a.question.text}*\n${a.answerMessage}`)
          .join('\n')


        attachments.push({
          author_name: answers[0].user.name,
          author_icon: answers[0].user.profile.image_24,
          text
        })
      }

      await this.webClient.chat.postMessage({
        channel: standUp.channel.id,
        text: `Standup report`,
        attachments
      })
  }

  async init(): Promise<any> {
    this.rtm.on('connected', () => {
      console.log('Slack RTM connected')
    });

    this.message$ = new Observable((observer) => {
      const userRepository = this.connection.getRepository(User);


      /*const botMessageExample =  { type: 'message',
        subtype: 'bot_message',
        text: 'Hello, it\'s time to start your daily standup',
        suppress_notification: false,
        username: 'Standup Bot',
        bot_id: 'B6GQCM4P5',
        team: 'T6GQB7CSF',
        attachments:
          [ { callback_id: 'standup_invite',
            text: 'Choose start asking in chat or open dialog window',
            id: 1,
            actions: [Array],
            fallback: 'Choose start asking in chat or open dialog window' } ],
        channel: 'D6HVDGXSB',
        event_ts: '1556085305.003000',
        ts: '1556085305.003000' }*/

      /*const userMessageExample = {
        client_msg_id: '9946389c-f9fb-491d-b717-3f2b82baf810',
        suppress_notification: false,
        type: 'message',
        text: 'фывафывафыв!!!!!!!!!!!!!!!',
        user: 'U6GSG49R8',
        team: 'T6GQB7CSF',
        channel: 'D6HVDGXSB',
        event_ts: '1556085558.003300',
        ts: '1556085558.003300'
      }*/


      this.rtm.on('message', async (messageResponse: RTMMessageResponse) => {
        if (messageResponse.type !== "message" || !messageResponse.client_msg_id) {
          return;
        }
        // be sure it is direct answerMessage to bot
        if (!userRepository.findOne({where: {im: messageResponse.channel}})) {
          logError(`User channel ${messageResponse.channel} is not im`);
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
        logError(message)
        observer.complete();
      });
    });

    const channelRepository = this.connection.getCustomRepository(ChannelRepository);
    const joinSlackChannel = async (channel: SlackChannel) => {
      let ch = await channelRepository.findOne(channel.id);
      const isNew = !ch;
      if (!ch) {
        ch = new Channel();
        ch.id = channel.id
      }

      ch.name = channel.name
      ch.isArchived = channel.is_archived
      ch.isEnabled = true

      if (isNew) {
        await channelRepository.addNewChannel(ch)
      } else {
        await channelRepository.save(ch);
      }
    }

    const leftSlackChannel = async (channel: SlackChannel) => {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel();
        ch.id = channel.id
      }

      ch.name = channel.name
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

      ch.name = channel.name
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

      ch.name = channel.name
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

  async findProgressByUser(user: IUser): Promise<StandUp> {
    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository.createQueryBuilder('standup');

    this.qbStandUpJoins(qb)
    this.qbActualStandUpInProgressWithAuthorAnswers(qb, user);

    return await qb
      .orderBy('standup.start', "DESC")
      // TODO limit only for standup
      .getOne();
  }

  public qbActualStandUpInProgressWithAuthorAnswers(qb: SelectQueryBuilder<StandUp>, user: IUser): SelectQueryBuilder<StandUp> {
    qb.andWhere('users.id = :user', {user: user.id})
    this.qbStandUpInProgress(qb);
    this.qbActiveQuestions(qb);
    this.qbActiveChannels(qb)
    return this.qbAuthorAnswers(qb, user);
  }

  // TODO move to repository
  // with channel channelUsers questions answers answerAuthor
  private qbStandUpJoins(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    return qb.innerJoinAndSelect('standup.channel', 'channel')
      .innerJoinAndSelect('channel.users', 'users') // TODO remove / reanme channelUsers
      .innerJoinAndSelect('channel.questions', 'questions')
      .leftJoinAndSelect('standup.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answerAuthor')
  }

  public qbStandUpInProgress(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    return qb.andWhere('CURRENT_TIMESTAMP <= standup.end');
  }

  private qbAuthorAnswers(qb: SelectQueryBuilder<StandUp>, user: IUser): SelectQueryBuilder<StandUp> {
    return qb.andWhere('answerAuthor.id = :answerAuthorID or answerAuthor.id IS NULL', {answerAuthorID: user.id})
  }

  private qbActiveQuestions(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    qb.andWhere('questions.isEnabled = true');
    return qb.orderBy("questions.index", "ASC");
  }

  private qbActiveChannels(qb: SelectQueryBuilder<StandUp>): SelectQueryBuilder<StandUp> {
    return qb
      .andWhere('channel.isArchived = false')
      .andWhere('channel.isEnabled = true')
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
      .orderBy("question.index", "ASC")
      .getMany()
  }

  findOneQuestion(channel: Channel, index): Promise<Question> {
    return this.connection.getRepository(Question).findOne({
      where: {
        index: index,
        channel: channel
      }
    })
  }

  async updateData(team: Team) {
    await this.updateUsers(team)
    await this.updateChannels(team)
  }

  private async updateUsers(team: Team) {
    const userRepository = this.connection.getRepository(User);

    /* https://api.slack.com/methods/users.list */
    let usersResponse: IUsersResponse;

    do {
      let cursor = undefined;
      if (usersResponse) {
        cursor = usersResponse.response_metadata.next_cursor
      }
      usersResponse = await this.webClient.users.list({limit: 200, cursor}) as IUsersResponse;
      if (!usersResponse.ok) {
        // throw..
        logError(usersResponse.error)
        return;
      }

      for (const member of usersResponse.members.filter(u => !u.is_bot && !u.deleted && !u.is_app_user)) {
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

        await userRepository.save(user)
      }

    } while (usersResponse.response_metadata.next_cursor)


    do {
      const response = await this.webClient.conversations.list({types: 'im'}) as any;
      if (!response.ok) {
        throw new Error(response.error);
      }
      const conversations = (response as any).channels as SlackIm[]

      for (const conversation of conversations.filter(c => c.is_im)) {
        const user = await userRepository.findOne(conversation.user)
        if (user) {
          user.im = conversation.id
          await userRepository.save(user);
        }
      }

    } while (false); // TODO cursor
  }

  private async updateChannels(team: Team) {
    // TODO fix update private channel where bot invited already
    const userRepository = this.connection.getRepository(User);
    //let channels: SlackConversation[]|SlackChannel[] = [];

    /*let response = await this.webClient.channels.list();
    if (!response.ok) {
      throw new Error(response.error);
    }
    channels = (response as any).channels as SlackChannel[]
    */
    /*response = await this.webClient.channels.list();
    if (!response.ok) {
      throw new Error(response.error);
    }*/
    // let privateChannels = ((response as any).groups as SlackGroup[])
    // channels = channels.concat(privateChannel as any)
    // channels = channels.concat(conversations as any)

    let response = await this.webClient.conversations.list({types: 'public_channel,private_channel'});
    if (!response.ok) {
      throw new Error(response.error);
    }
    const conversations = (response as any).channels as SlackConversation[]

    const channelRepository = this.connection.getCustomRepository(ChannelRepository)
    await this.connection.createQueryBuilder()
      .update(Channel)
      .where({team: team.id})
      .set({isArchived: true})
      .execute()

    for (const channel of conversations) {
      let ch = await channelRepository.findOne(channel.id, {relations: ['questions']})
      const isNewCh = !ch
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
      }

      ch.isEnabled = channel.is_member;
      ch.isArchived = channel.is_archived;
      ch.createdBy = await userRepository.findOne(channel.creator)
      if (!ch.createdBy) {
        logError('Created by is not found')
        continue;
      }
      ch.team = team
      if (!ch.team) {
        logError('Created by is not found')
        continue;
      }

      ch.name = channel.name
      ch.nameNormalized = channel.name_normalized
      await channelRepository.save(ch);

      if (isNewCh) {
        await channelRepository.addNewChannel(ch)
      } else {
        if (ch.questions.length === 0) {
          ch = await this.connection.manager.getCustomRepository(QuestionRepository).setupDefaultQuestionsToChannel(ch);
        }

        await channelRepository.save(ch);
      }


      let membersResponse = await this.webClient.conversations.members({channel: channel.id}) as { ok: boolean, members?: string[], error?: string };
      if (!membersResponse.ok) {
        throw new Error(membersResponse.error);
      }

      ch.users = await userRepository.createQueryBuilder('u').whereInIds(membersResponse.members).getMany()
      await channelRepository.save(ch);
    }
  }

  async standUpByIdAndUser(user: IUser, standUpId: any): Promise<StandUp>
  {
    const standUpRepository = this.connection.getRepository(StandUp);
    const qb = standUpRepository.createQueryBuilder('standup');

    this.qbStandUpJoins(qb)

    qb.andWhere('users.id = :user AND standup.id = :standup', {user: user.id, standup: standUpId})
    this.qbActiveQuestions(qb);
    this.qbActiveChannels(qb)
    this.qbAuthorAnswers(qb, user);

    return await qb
    //.orderBy('st.start', "DESC")
      .getOne();
  }

  async handleInteractiveAnswers(response: InteractiveResponse) {
    const user = await this.connection.getRepository(User).findOne(response.user);

    if (!response.callback_id.startsWith(CALLBACK_PREFIX_STANDUP_INVITE)) {
      throw new Error('Wrong response');
    }

    if (!user) {
      throw new Error(`User ${response.user} is not found`)
    }

    const standUpId = response.callback_id.split('.', 2)[1];


    if (!standUpId) {
      throw new Error(`Standup standUpId is not defined`)
    }

    // TODO already submit
    // const standUp = await this.findProgressByUser(user);


    const standUp = await this.standUpByIdAndUser(user, standUpId);

    if (!standUp) {
      throw new Error(`Standup #${standUpId} is not found`)
    }

    const inProgress = isInProgress(standUp)

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg)
      return;
    }

    const selectedActions = response.actions.map(a => a.value)

    if (selectedActions.includes(ACTION_START)) {
      this.agreeToStartSubject.next(user)
      return
    } else if (!selectedActions.includes(ACTION_OPEN_DIALOG)) {
      throw new Error("No corresponded actions")
    }

    const answers = standUp.answers.filter(a => a.user.id === user.id);
    const openDialogRequest = {
      trigger_id: response.trigger_id,
      //"token": this.webClient.token,
      dialog: {
        callback_id: `${CALLBACK_PREFIX_SEND_STANDUP_ANSWERS}`, // TODO multi standups
        title: `Standup #${standUp.team.name}`,
        submit_label: answers.length > 0 ? "Update" : "Submit",
        notify_on_cancel: true,
        state: JSON.stringify({standup: standUp.id}),
        elements: []
      }
    }

    for (const question of standUp.team.questions) {
      const element: any = {
        type: "textarea", // https://api.slack.com/dialogs#textarea_elements
        label: question.text.length > 24 ? question.text.slice(0, 21) + '...' : question.text,
        placeholder: question.text,
        name: question.index,
      }

      const answer = answers[question.index];
      if (answer) {
        element.value = answer.answerMessage;
      }

      openDialogRequest.dialog.elements.push(element);
    }

    try {
      const result = await this.webClient.apiCall('dialog.open', openDialogRequest)
      //console.log(result)
      //await this.rtm.send('dialog.open', openDialogRequest)
    } catch (e) {
      logError(e.message)
      logError(e.data.response_metadata.messages)
      throw new Error(e.message)
    }
  }

  async handleInteractiveResponse(response: InteractiveResponse) {
    const user = await this.connection.getRepository(User).findOne(response.user);

    if (!user) {
      throw new Error(`User ${response.user} is not found`)
    }

    if (response.callback_id.startsWith(CALLBACK_PREFIX_STANDUP_INVITE)) {
      await this.handleInteractiveAnswers(response)
    } else {
      logError(`There is no handler for callback ${response.callback_id}`);
    }
  }


  async handleInteractiveDialogSubmission(response: InteractiveDialogSubmissionResponse) {
    const user = await this.connection.getRepository(User).findOne(response.user.id);

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

    const dialogState = JSON.parse(response.state)

    if (typeof dialogState !== 'object' && !dialogState.standup) {
      throw new Error(`Dialog state "${response.state}" is wrong format`)
    }

    const standUp = await this.standUpByIdAndUser(user, dialogState.standup);
    const inProgress = isInProgress(standUp)

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg)
      return;
    }

    if (!standUp) {
      // TODO open alert?!
      await this.sendMessage(user, `I will remind you when your next standup is up`)
      return;
    }


    if (standUp.answers.length === 0) {
      this.messagesSubject.next(messages)
    } else {
      if (standUp.team.questions.length === 0) {
        throw new Error('Team have not any questions');
      }

      if (standUp.answers.filter(a => a.user.id === user.id).length !== standUp.answers.length) {
        throw new Error('Standup should contains current user answers only');
      }

      await this.updateStandUpAnswers(messages.map(m => m.text), user, standUp)
    }
  }


  async updateStandUpAnswers(messages: string[], user: IUser, standUp: IStandUp)
  {
    await this.connection.transaction(async (em) => {
      const repo = em.getRepository(AnswerRequest);

      for(const q of standUp.team.questions) { // sort asc by index
        let answer = standUp.answers[q.index];
        if (!answer) {
          answer = new AnswerRequest()
          answer.user = user
          answer.question = q
          answer.standUp = standUp;
        }
        answer.answerMessage = messages[q.index]
        answer.answerCreatedAt = new Date();

        await repo.save(answer as any)
      }
    })
  }

  async handleInteractiveDialogSubmissionResponse(response: InteractiveDialogSubmissionResponse) {
    if (response.callback_id.startsWith(CALLBACK_PREFIX_SEND_STANDUP_ANSWERS)) {
      await this.handleInteractiveDialogSubmission(response)
    } else {
      logError(`There is no handler for callback ${response.callback_id}`);
    }
  }
}

const isInProgress = (standUp: IStandUp) => {
  return new Date().getTime() < standUp.end.getTime()
}