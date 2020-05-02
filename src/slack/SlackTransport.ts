import {Inject, Injectable, InjectionToken} from "injection-js";
import {Observable, Subject} from "rxjs";
import {IMessage, IStandUp, ITransport, IUser} from "../bot/models";
import User from "../model/User";
import {MessageResponse} from "./model/MessageResponse";
import {logError} from "../services/logError";
import {ChannelRepository} from "../repository/ChannelRepository";
import {Channel} from "../model/Channel";
import {Connection, DeepPartial} from "typeorm";
import {ChannelLeft, MemberJoinedChannel, SlackChannel, SlackConversation} from "./model/SlackChannel";
import {ScopeGranted, SlackIm} from "./model/ScopeGranted";
import Team from "../model/Team";
import {
  ACTION_OPEN_DIALOG,
  ACTION_START, CALLBACK_PREFIX_SEND_STANDUP_ANSWERS,
  CALLBACK_PREFIX_STANDUP_INVITE,
  SlackStandUpProvider
} from "./SlackStandUpProvider";
import {SlackTeam} from "./model/SlackTeam";
import {QuestionRepository} from "../repository/QuestionRepository";
import {
  InteractiveDialogSubmissionResponse,
  InteractiveResponse,
  InteractiveResponseTypeEnum
} from "./model/InteractiveResponse";
import AnswerRequest from "../model/AnswerRequest";
import StandUp from "../model/StandUp";
import * as groupBy from "lodash.groupby";
import {DialogOpenArguments, MessageAttachment, WebClient} from '@slack/web-api'
import {ISlackUser} from "./model/SlackUser";
import {SlackEventAdapter} from "@slack/events-api/dist/adapter";
import {Job, Queue} from "bullmq";

const standUpFinishedAlreadyMsg = `Stand up has already ended\nI will remind you when your next stand up would came`; // TODO link to report

export const SLACK_EVENTS = new InjectionToken<ITransport>('slack_events');

export const isInProgress = (standUp: IStandUp) => {
  return new Date().getTime() < standUp.endAt.getTime()
}

const QUEUE_SLACK_EVENT_PREFIX = 'slack-event';
const QUEUE_SLACK_EVENT_MESSAGE = QUEUE_SLACK_EVENT_PREFIX + '_message';
const QUEUE_SLACK_EVENT_MEMBER_LEFT_CHANNEL = QUEUE_SLACK_EVENT_PREFIX + '_member-left-channel';
const QUEUE_SLACK_EVENT_MEMBER_JOINED_CHANNEL = QUEUE_SLACK_EVENT_PREFIX + '_member-joined-channel';
const QUEUE_SLACK_EVENT_CHANNEL_JOINED = QUEUE_SLACK_EVENT_PREFIX + '_channel-joined';
const QUEUE_SLACK_EVENT_GROUP_JOINED = QUEUE_SLACK_EVENT_PREFIX + '_group-joined';
const QUEUE_SLACK_EVENT_CHANNEL_LEFT = QUEUE_SLACK_EVENT_PREFIX + '_channel-left';
export const QUEUE_SLACK_INTERACTIVE_RESPONSE = 'slack-interactive-response';
export const QUEUE_SLACK_SYNC_DATA = 'slack_sync-data';

@Injectable()
export class SlackTransport implements ITransport {
  private agreeToStartSubject = new Subject<{user: IUser, date: Date}>();
  private messagesSubject = new Subject<IMessage[]>();

  agreeToStart$ = this.agreeToStartSubject.asObservable();
  message$ = new Subject<IMessage>();
  messages$: Observable<IMessage[]> = this.messagesSubject.asObservable();

  constructor(
    @Inject(SLACK_EVENTS) private readonly slackEvents: SlackEventAdapter,
    private readonly queue: Queue,
    private readonly webClient: WebClient,
    private connection: Connection,
    private slackStandUpProvider: SlackStandUpProvider,
  ) {
  }

  init(): void {
    this.slackEvents.on('message', async (messageResponse: MessageResponse) => {
      if (messageResponse.type !== "message" || !messageResponse.client_msg_id) {
        // log?!
        return;
      }

      await this.queue.add(QUEUE_SLACK_EVENT_MESSAGE, messageResponse);
    });


    this.slackEvents.on('error', async (message) => {
      logError(message);
      this.message$.error(message);
    });

    this.slackEvents.on('member_left_channel', async (response: MemberJoinedChannel) => {
      await this.queue.add(QUEUE_SLACK_EVENT_MEMBER_LEFT_CHANNEL, response);

      console.log('member_left_channel', response)
    })
    this.slackEvents.on('member_joined_channel', async (response: MemberJoinedChannel) => {
      await this.queue.add(QUEUE_SLACK_EVENT_MEMBER_JOINED_CHANNEL, response);
    })

    this.slackEvents.on('channel_joined', async (response) => {
      await this.queue.add(QUEUE_SLACK_EVENT_CHANNEL_JOINED, response);
    });
    this.slackEvents.on('group_joined', async (response) => {
      await this.queue.add(QUEUE_SLACK_EVENT_GROUP_JOINED, response);
    });

    this.slackEvents.on('channel_left', async (response: ChannelLeft) => {
      await this.queue.add(QUEUE_SLACK_EVENT_CHANNEL_LEFT, response);
    });
    this.slackEvents.on('group_left', async (response) => {
      console.log('group_left', response);

      const channel: string = response.channel;
      await this.findOrCreateAndUpdate(channel, {isEnabled: false})
    });


    this.slackEvents.on('channel_archive', async (response: {type: string, channel: string, user: string}) => {
      const channel: string = response.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: true})
    });
    this.slackEvents.on('group_archive', async (response) => {
      const channel: string = response.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: true})
    });


    this.slackEvents.on('channel_unarchive', async (response) => {
      const channel: string = response.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: false})
    });
    this.slackEvents.on('group_unarchive', async (response) => {
      const channel: string = response.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: false})
    });


    // https://api.slack.com/events/scope_granted
    this.slackEvents.on('scope_granted', async (scopeGranted: ScopeGranted) => {
      console.log(`Scope granted for team "${scopeGranted.team_id}"`);

      const teamRepository = this.connection.getRepository(Team);
      let team = await teamRepository.findOne(scopeGranted.team_id);
      if (!team) {
        team = new Team();
        team.id = scopeGranted.team_id;
        // https://api.slack.com/methods/team.info
        const teamInfo: {team: SlackTeam} = (await this.webClient.team.info()) as any;
        team.name = teamInfo.team.name;``
        team.domain = teamInfo.team.domain
        await teamRepository.save(team);
      }

      // TODO move to cmd this.syncService.exec(getSyncSlackTeamKey(team.id), this.syncData(team));
    })
  }

  public async handelJob(job: Job) {
    if (job.name === QUEUE_SLACK_EVENT_MESSAGE) {
      const userRepository = this.connection.getRepository(User);

      const messageResponse = job.data as MessageResponse;

      // be sure it is direct answerMessage to bot
      if (!await userRepository.findOne({where: {im: messageResponse.channel}})) {
        logError(`User channel ${messageResponse.channel} is not im`);
        // TODO try update from api
        return true
      }

      const eventAt = new Date(parseInt(messageResponse.event_ts) * 1000)

      const message = {
        //team: await this.connection.getRepository(Channel).findOne(messageResponse.channel),
        text: messageResponse.text,
        user: await this.connection.getRepository(User).findOne(messageResponse.user),
        createdAt: eventAt
      } as IMessage;

      this.message$.next(message)
    } else if (job.name === QUEUE_SLACK_EVENT_MEMBER_JOINED_CHANNEL) {
      const response = job.data as MemberJoinedChannel
      await this.joinSlackChannel(response.channel);
    } else if (job.name === QUEUE_SLACK_EVENT_CHANNEL_JOINED) {
      const channel = job.data.channel as SlackChannel;
      await this.joinSlackChannel(channel.id, {
        isArchived: channel.is_archived,
        name: channel.name,
        nameNormalized: channel.name_normalized
      })
    } else if (job.name === QUEUE_SLACK_EVENT_GROUP_JOINED) {
      const response = job.data
      const channel = response.channel as SlackChannel;
      await this.joinSlackChannel(channel.id, {
        isArchived: channel.is_archived,
        name: channel.name,
        nameNormalized: channel.name_normalized
      })
    } else if (job.name === QUEUE_SLACK_SYNC_DATA) {
      const team = await this.connection.getRepository(Team).findOne(job.data.teamId)
      await this.syncData(team)
    } else if (job.name === QUEUE_SLACK_INTERACTIVE_RESPONSE) {
      const response = job.data;
      try {
        if (response.type === InteractiveResponseTypeEnum.interactive_message) {
          await this.handleInteractiveResponse(response as InteractiveResponse)
        } else if (response.type === InteractiveResponseTypeEnum.dialog_submission) {
          await this.handleInteractiveDialogSubmissionResponse(response as InteractiveDialogSubmissionResponse)
        } else {
          // log
        }
      } catch (e) {
        logError(e);
      }
    } else if (job.name === QUEUE_SLACK_EVENT_CHANNEL_LEFT) {
      const response = job.data as ChannelLeft
      await this.findOrCreateAndUpdate(response.channel, {isEnabled: false})

      return true;
    } else {
      return false
    }


    return true
  }

  public async findOrCreateAndUpdate(channelID: string, data: DeepPartial<Channel>): Promise<{channel: Channel, isNew: boolean}> {
    const {channel, isNew} = await this.findOrCreateChannel(channelID);
    Object.assign(channel, data);
    if (isNew) {
      const channelInfo = (await this.webClient.conversations.info({channel: channel.id})).channel as SlackConversation

      channel.name = channelInfo.name;
      channel.nameNormalized = channelInfo.name_normalized;
    }
    const channelRepository = this.connection.getCustomRepository(ChannelRepository);
    await channelRepository.save(channel);

    return {channel, isNew}
  };

  private async findOrCreateChannel(channelID: string): Promise<{channel: Channel, isNew: boolean}>{
    let channel = await this.connection.getCustomRepository(ChannelRepository).findOne(channelID);
    const isNew = !channel;
    if (isNew) {
      channel = new Channel();
      channel.id = channelID;
      channel.isEnabled = false
    }

    return {channel, isNew};
  };

  private async joinSlackChannel(channelID: string, data?: DeepPartial<Channel>) {
    const {channel, isNew} = await this.findOrCreateChannel(channelID);

    channel.isArchived = false;
    channel.isEnabled = true;
    if (data) {
      Object.assign(channel, data);
    }

    const channelRepository = this.connection.getCustomRepository(ChannelRepository);

    if (isNew) {
      await channelRepository.addNewChannel(channel)
    } else {
      await channelRepository.save(channel);
    }

    await this.webClient.chat.postMessage({
      channel: channel.id,
      text: 'Hi everyone, I am here!'
    })
  }

  async syncData(team: Team) {
    const teamResponse: {team: SlackTeam} = await this.webClient.team.info() as any;

    if (team.id !== teamResponse.team.id) {
      throw new Error(`Wrong team id #${teamResponse.team.id}. Should ${team.id}`);
    }
    team.slackData = teamResponse.team;
    const teamRepository = this.connection.getRepository(Team);
    team = await teamRepository.save(team);

    await this.updateUsers(team);
    await this.updateChannels(team);
  }

  private async updateUsers(team: Team) {
    const userRepository = this.connection.getRepository(User);

    /* https://api.slack.com/methods/users.list */
    let usersResponse;
    let cursor = null;
    do {
      cursor = usersResponse?.response_metadata?.next_cursor;
      usersResponse = await this.webClient.users.list({limit: 200, cursor});
      if (!usersResponse.ok) {
        // throw..
        logError(usersResponse.error)
        return;
      }


      for (const member of (usersResponse.members as ISlackUser[]).filter(u => !u.is_bot && !u.deleted && !u.is_app_user)) {
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

        user.team = team; //await teamRepository.findOne(member.team_id);

        await userRepository.save(user)
      }

    } while (usersResponse.response_metadata.next_cursor);


    let conversationsResponse;
    cursor = null;
    do {
      cursor = conversationsResponse?.response_metadata?.next_cursor;
      conversationsResponse = await this.webClient.conversations.list({types: 'im', limit: 200, cursor});
      if (!conversationsResponse.ok) {
        throw new Error(conversationsResponse.error);
      }
      const conversations = conversationsResponse['channels'] as SlackIm[];
      for (const conversation of conversations.filter(c => c.is_im)) {
        const user = await userRepository.findOne(conversation.user);
        if (user) {
          user.im = conversation.id;
          await userRepository.save(user);
        }
      }
    } while (conversationsResponse.response_metadata.next_cursor);
  }

  private async updateChannels(team: Team) {
    // TODO fix update private channel where bot invited already
    const userRepository = this.connection.getRepository(User);
    const response = await this.webClient.conversations.list({types: 'public_channel,private_channel'});
    /*let response = await this.webClient.users.conversations({
      types: 'public_channel,private_channel',
    });*/
    if (!response.ok) {
      throw new Error(response.error);
    }
    const conversations = (response as any).channels as SlackConversation[];
    const channelRepository = this.connection.getCustomRepository(ChannelRepository);
    await this.connection.createQueryBuilder()
      .update(Channel)
      .where({team: team.id})
      .set({isArchived: true})
      .execute()

    for (const channel of conversations) {
      let ch = await channelRepository.findOne(channel.id, {relations: ['questions']});
      const isNewCh = !ch
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
      }

      ch.isEnabled = channel.is_member;
      ch.isArchived = channel.is_archived;
      ch.createdBy = await userRepository.findOne(channel.creator);
      if (!ch.createdBy) {
        logError('Created by is not found');
        continue;
      }
      ch.team = team
      if (!ch.team) {
        logError('Created by is not found');
        continue;
      }

      ch.name = channel.name
      ch.nameNormalized = channel.name_normalized
      await channelRepository.save(ch);

      if (isNewCh) {
        await channelRepository.addNewChannel(ch)
      } else {
        if (ch.questions.length === 0) {
          await this.connection.manager.getCustomRepository(QuestionRepository)
            .setupDefaultQuestionsToChannel(ch);
        }
      }


      let membersResponse = await this.webClient.conversations.members({channel: channel.id}) as { ok: boolean, members?: string[], error?: string };
      if (!membersResponse.ok) {
        throw new Error(membersResponse.error);
      }

      ch.users = await userRepository.createQueryBuilder('u').whereInIds(membersResponse.members).getMany();
      await channelRepository.save(ch);
    }
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
    // const standUp = await this.findByUser(user);


    const standUp = await this.slackStandUpProvider.standUpByIdAndUser(user, standUpId);

    if (!standUp) {
      throw new Error(`Standup #${standUpId} is not found`)
    }

    const inProgress = isInProgress(standUp);

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg);
      return;
    }

    const selectedActions = response.actions.map(a => a.value);

    const msgDate = new Date(parseInt(response.message_ts) * 1000);

    if (selectedActions.includes(ACTION_START)) {
      this.agreeToStartSubject.next({user, date: msgDate});
      return
    } else if (!selectedActions.includes(ACTION_OPEN_DIALOG)) {
      throw new Error("No corresponded actions")
    }

    const answers = standUp.answers.filter(a => a.user.id === user.id);
    const openDialogRequest: DialogOpenArguments = {
      trigger_id: response.trigger_id,
      //"token": this.webClient.token,
      dialog: {
        callback_id: `${CALLBACK_PREFIX_SEND_STANDUP_ANSWERS}`, // .${standUp.id}. see state
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
      await this.webClient.dialog.open(openDialogRequest)
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

    if (!response.callback_id.startsWith(CALLBACK_PREFIX_SEND_STANDUP_ANSWERS)) {
      throw new Error('Wrong response');
    }

    if (!user) {
      throw new Error(`User ${response.user} is not found`)
    }

    // const standUpId = response.callback_id.split('.', 2)[1];

    const channelTeam = user.team.channels.filter((channel) => (channel.id === response.channel.id)).pop();
    if (!user) {
      throw new Error(`Channel team ${response.channel.id} is not found`)
    }

    const messages: IMessage[] = []
    const msgDate = new Date(parseInt(response.action_ts) * 1000);

    for (const index of Object.keys(response.submission).sort((current, next) => current > next ? 1 : -1)) {
      const text = response.submission[index]
      messages.push({
        team: channelTeam,
        text: text,
        user: user,
        createdAt: msgDate
      } as IMessage)
    }

    const dialogState = JSON.parse(response.state)

    if (typeof dialogState !== 'object' && !dialogState.standup) {
      throw new Error(`Dialog state "${response.state}" is wrong format`)
    }

    const standUp = await this.slackStandUpProvider.standUpByIdAndUser(user, dialogState.standup);
    const inProgress = isInProgress(standUp)

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg)
      return;
    }

    if (!standUp) {
      // TODO open alert?!
      await this.sendMessage(user, `I will remind you when your next standup is up!!!`);
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

  async updateStandUpAnswers(messages: string[], user: IUser, standUp: IStandUp) {
    await this.connection.transaction(async (em) => {
      const repo = em.getRepository(AnswerRequest);

      for (const q of standUp.team.questions) { // sort asc by index
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

  async sendGreetingMessage(user: User, standUp: StandUp) {
    const callbackId = `${CALLBACK_PREFIX_STANDUP_INVITE}.${standUp.id}`;

    const buttonsAttachment: MessageAttachment = {
      text: "Choose start poll in chat or open dialog window",
      callback_id: callbackId,
      actions: [
        {
          name: "start",
          text: "Start",
          type: "button",
          value: ACTION_START
        },
        {
          name: "dialog",
          text: "Open dialog",
          type: "button",
          value: ACTION_OPEN_DIALOG
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
      channel: user.im,
      text: "Hello, it's time to start your daily standup", // TODO  for *my_private_team*
      attachments: [buttonsAttachment]
    })

    // result.response_metadata.
  }

  async sendReport(standUp: StandUp) {
    const attachments = []

    const userAnswers = groupBy(standUp.answers, 'user.id');
    for (const userID in userAnswers) {
      const answers: AnswerRequest[] = userAnswers[userID];
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

    let text = `Standup complete `
    // TODO link
    if (attachments.length === 0) {
      text += ' Nobody sent answers 🐥'
    }
    await this.webClient.chat.postMessage({
      channel: standUp.channel.id,
      text,
      attachments
    })
  }

  async sendMessage(user: User, message: string): Promise<any> {
    return this.webClient.chat.postMessage({text: message, channel: user.im});
  }
}
