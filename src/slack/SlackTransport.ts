import {Inject, Injectable} from "injection-js";
import {Observable, Subject} from "rxjs";
import {IMessage, ITransport, IUser} from "../bot/models";
import User from "../model/User";
import {MessageResponse} from "./model/MessageResponse";
import {ChannelRepository} from "../repository/ChannelRepository";
import {Connection, DeepPartial} from "typeorm";
import {ChannelLeft, MemberJoinedChannel, SlackChannel, SlackConversation} from "./model/SlackChannel";
import {ScopeGranted, SlackIm} from "./model/ScopeGranted";
import SlackWorkspace from "../model/SlackWorkspace";
import {
  ACTION_OPEN_DIALOG,
  ACTION_START,
  CALLBACK_PREFIX_SEND_STANDUP_ANSWERS,
  CALLBACK_PREFIX_STANDUP_INVITE,
  SlackStandUpProvider
} from "./SlackStandUpProvider";
import {SlackTeam} from "./model/SlackTeam";
import {
  InteractiveDialogSubmissionResponse,
  InteractiveResponse,
  InteractiveResponseTypeEnum
} from "./model/InteractiveResponse";
import AnswerRequest from "../model/AnswerRequest";
import StandUp from "../model/StandUp";
import groupBy from "lodash.groupby";
import {
  ChatPostMessageArguments,
  DialogOpenArguments,
  MessageAttachment,
  WebAPIPlatformError,
  WebClient
} from '@slack/web-api'
import {ISlackUser} from "./model/SlackUser";
import {SlackEventAdapter} from "@slack/events-api/dist/adapter";
import {IQueueFactory, LOGGER_TOKEN, QUEUE_FACTORY_TOKEN} from "../services/token";
import {Logger} from "winston";
import {Channel} from "../model/Channel";
import {QUEUE_MAIN_NAME} from "../services/providers";

const standUpFinishedAlreadyMsg = `Stand up has already ended\nI will remind you when your next stand up would came`; // TODO link to report

const QUEUE_SLACK_EVENT_PREFIX = 'slack-event';
const QUEUE_SLACK_EVENT_MESSAGE = QUEUE_SLACK_EVENT_PREFIX + '_message';
const QUEUE_SLACK_EVENT_MEMBER_LEFT_CHANNEL = QUEUE_SLACK_EVENT_PREFIX + '_member-left-channel';
const QUEUE_SLACK_EVENT_MEMBER_JOINED_CHANNEL = QUEUE_SLACK_EVENT_PREFIX + '_member-joined-channel';
const QUEUE_SLACK_EVENT_CHANNEL_JOINED = QUEUE_SLACK_EVENT_PREFIX + '_channel-joined';
const QUEUE_SLACK_EVENT_GROUP_JOINED = QUEUE_SLACK_EVENT_PREFIX + '_group-joined';
const QUEUE_SLACK_EVENT_CHANNEL_LEFT = QUEUE_SLACK_EVENT_PREFIX + '_channel-left';
const QUEUE_SLACK_EVENT_GROUP_LEFT = QUEUE_SLACK_EVENT_PREFIX + '_group-left';
const QUEUE_SLACK_EVENT_CHANNEL_ARCHIVE = QUEUE_SLACK_EVENT_PREFIX + '_channel-archive';
const QUEUE_SLACK_EVENT_GROUP_ARCHIVE = QUEUE_SLACK_EVENT_PREFIX + '_group-archive';
const QUEUE_SLACK_EVENT_CHANNEL_UNARCHIVE = QUEUE_SLACK_EVENT_PREFIX + '_channel-unarchive';
const QUEUE_SLACK_EVENT_GROUP_UNARCHIVE = QUEUE_SLACK_EVENT_PREFIX + '_group-unarchive';

export const QUEUE_SLACK_INTERACTIVE_RESPONSE = 'slack-interactive-response';
export const QUEUE_SLACK_SYNC_DATA = 'slack_sync-data';

@Injectable()
export class SlackTransport implements ITransport {
  private agreeToStartSubject = new Subject<{user: IUser, date: Date}>();
  private batchMessagesSubject = new Subject<IMessage[]>();

  agreeToStart$ = this.agreeToStartSubject.asObservable();
  message$ = new Subject<IMessage>();
  batchMessages$: Observable<IMessage[]> = this.batchMessagesSubject.asObservable();

  constructor(
    private slackEvents: SlackEventAdapter,
    @Inject(LOGGER_TOKEN) private logger: Logger,
    @Inject(QUEUE_FACTORY_TOKEN) private queueFactory: IQueueFactory,
    private webClient: WebClient,
    private connection: Connection,
    private slackStandUpProvider: SlackStandUpProvider,
  ) {
  }

  initSlackEvents(): void {
    const queue = this.queueFactory(QUEUE_MAIN_NAME);

    this.slackEvents.on('error', async (error) => {
      this.logger.error('Receive slack events error', {error})
    });

    this.slackEvents.on('message', async (messageResponse: MessageResponse) => {
      await queue.add(QUEUE_SLACK_EVENT_MESSAGE, messageResponse);
    });

    this.slackEvents.on('member_left_channel', async (response: MemberJoinedChannel) => {
      await queue.add(QUEUE_SLACK_EVENT_MEMBER_LEFT_CHANNEL, response);
    })
    this.slackEvents.on('member_joined_channel', async (response: MemberJoinedChannel) => {
      await queue.add(QUEUE_SLACK_EVENT_MEMBER_JOINED_CHANNEL, response);
    })
    this.slackEvents.on('channel_joined', async (response) => {
      await queue.add(QUEUE_SLACK_EVENT_CHANNEL_JOINED, response);
    });
    this.slackEvents.on('group_joined', async (response) => {
      await queue.add(QUEUE_SLACK_EVENT_GROUP_JOINED, response);
    });
    this.slackEvents.on('channel_left', async (response: ChannelLeft) => {
      await queue.add(QUEUE_SLACK_EVENT_CHANNEL_LEFT, response);
    });
    this.slackEvents.on('group_left', async (response) => {
      await queue.add(QUEUE_SLACK_EVENT_GROUP_LEFT, response);
    });


    this.slackEvents.on('channel_archive', async (response: {type: string, channel: string, user: string}) => {
      await queue.add(QUEUE_SLACK_EVENT_CHANNEL_ARCHIVE, response);
    });
    this.slackEvents.on('group_archive', async (response) => {
      await queue.add(QUEUE_SLACK_EVENT_GROUP_ARCHIVE, response);
    });

    this.slackEvents.on('channel_unarchive', async (response) => {
      await queue.add(QUEUE_SLACK_EVENT_CHANNEL_UNARCHIVE, response);
    });
    this.slackEvents.on('group_unarchive', async (response) => {
      await queue.add(QUEUE_SLACK_EVENT_GROUP_UNARCHIVE, response);
    });


    // https://api.slack.com/events/scope_granted
    this.slackEvents.on('scope_granted', async (scopeGranted: ScopeGranted) => {
      this.logger.info(`Scope granted for team`, {team: scopeGranted.team_id})

      const teamRepository = this.connection.getRepository(SlackWorkspace);
      let team = await teamRepository.findOne(scopeGranted.team_id);
      if (!team) {
        team = new SlackWorkspace();
        team.id = scopeGranted.team_id;
        await this.updateWorkspace(team)
      }

      // TODO move to cmd this.syncService.exec(getSyncSlackTeamKey(team.id), this.syncData(team));
    })
  }

  public async handelJob(name: string, data: any) {
    if (name === QUEUE_SLACK_EVENT_MESSAGE) {
      const userRepository = this.connection.getRepository(User);

      const messageResponse = data as MessageResponse;

      // be sure it is direct answerMessage to bot
      /*if (!await userRepository.findOne({where: {im: messageResponse.channel}})) {
        this.logger.error(`User channel ${messageResponse.channel} is not im`);
        // TODO try update from api
        return true
      }*/

      const eventAt = new Date(parseInt(messageResponse.event_ts) * 1000)
      const user = await this.connection.getRepository(User).findOne(messageResponse.user)

      if (!user) {
        this.logger.warn('Message author is not found', {
          messageResponse: messageResponse
        })
        return true;
      }

      const message = {
        text: messageResponse.text,
        user,
        createdAt: eventAt
      } as IMessage;

      this.message$.next(message)
    } else if (name === QUEUE_SLACK_EVENT_MEMBER_JOINED_CHANNEL) {
      const response = data as MemberJoinedChannel
      const workspaceRepository = this.connection.getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.updateWorkspace(workspace)

      try {
        await this.joinSlackChannel(response.channel, {
          workspace: workspace
        });
      } catch (e) {
        if (e.code === 'slack_webapi_platform_error' && (e as WebAPIPlatformError).data.error === 'not_in_channel') {
          this.logger.warn('Can not joined channel', {error: e})
        } else {
          throw e
        }
      }
    } else if (name === QUEUE_SLACK_EVENT_CHANNEL_JOINED || name === QUEUE_SLACK_EVENT_GROUP_JOINED) {
      const channel = data.channel as SlackChannel;

      try {
        // TODO use channel.members
        await this.joinSlackChannel(channel.id, {
          isArchived: channel.is_archived,
          name: channel.name,
          nameNormalized: channel.name_normalized
        })
      } catch (e) {
        if (e.code === 'slack_webapi_platform_error' && (e as WebAPIPlatformError).data.error === 'not_in_channel') {
          this.logger.warn('Can not joined channel', {error: e})
          // throw new SyncDataProblem
        } else {
          throw e
        }
      }
    } else if (name === QUEUE_SLACK_SYNC_DATA) {
      const workspace = await this.connection.getRepository(SlackWorkspace).findOne(data.teamId)
      await this.syncData(workspace)
    } else if (name === QUEUE_SLACK_INTERACTIVE_RESPONSE) {
      const response = data;

      this.logger.debug('Interactive response handling', {response});
      try {
        if (response.type === InteractiveResponseTypeEnum.interactive_message) {
          await this.handleInteractiveResponse(response as InteractiveResponse)
        } else if (response.type === InteractiveResponseTypeEnum.dialog_submission) {
          await this.handleInteractiveDialogSubmissionResponse(response as InteractiveDialogSubmissionResponse)
        } else {
          this.logger.error('Wrong interactive response type', {response});
        }
      } catch (e) {
        this.logger.error('Interactive response handle', {error: e.message, stack: e.stack});
      }
    } else if (name === QUEUE_SLACK_EVENT_CHANNEL_LEFT) {
      const response = data as ChannelLeft
      await this.findOrCreateAndUpdate(response.channel, {isEnabled: false})
    } else if (name === QUEUE_SLACK_EVENT_GROUP_LEFT) {
      const channel: string = data.channel;
      await this.findOrCreateAndUpdate(channel, {isEnabled: false})
    } else if (name === QUEUE_SLACK_EVENT_CHANNEL_ARCHIVE) {
      const channel: string = data.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: true})
    } else if (name === QUEUE_SLACK_EVENT_GROUP_ARCHIVE) {
      const channel: string = data.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: true})
    } else if (name === QUEUE_SLACK_EVENT_CHANNEL_UNARCHIVE) {
      const channel: string = data.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: false})
    } else if (name === QUEUE_SLACK_EVENT_GROUP_UNARCHIVE) {
      const channel: string = data.channel;
      await this.findOrCreateAndUpdate(channel, {isArchived: false})
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
    const {channel} = await this.findOrCreateChannel(channelID);

    channel.isArchived = false;
    channel.isEnabled = true;
    if (data) {
      Object.assign(channel, data);
    }

    const channelRepository = this.connection.getCustomRepository(ChannelRepository);
    await channelRepository.save(channel);
    await this.updateChannelMembers(channel)


    /*await this.postMessage({
      channel: channel.id,
      text: 'Hi everyone, I am here! Every one here will be receive questions. Open settings if want change'
    })*/
  }

  async syncData(workspace: SlackWorkspace) {
    const teamResponse: {team: SlackTeam} = await this.webClient.team.info({team: workspace.id}) as any;

    if (workspace.id !== teamResponse.team.id) {
      throw new Error(`Wrong team id #${teamResponse.team.id}. Workspace #${workspace.id}`);
    }

    workspace.slackData = teamResponse.team;
    const teamRepository = this.connection.getRepository(SlackWorkspace);
    workspace = await teamRepository.save(workspace);

    await this.updateUsers(workspace);
    await this.updateChannels(workspace);
  }

  private async updateUsers(workspace: SlackWorkspace) {
    const userRepository = this.connection.getRepository(User);

    /* https://api.slack.com/methods/users.list */
    let usersResponse;
    let cursor = null;
    do {
      cursor = usersResponse?.response_metadata?.next_cursor;
      usersResponse = await this.webClient.users.list({limit: 200, cursor});
      if (!usersResponse.ok) {
        // throw..
        this.logger.error('Fetch users error', {error: usersResponse.error})
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

        if (member.team_id !== workspace.id) {
          throw new Error(`Workspace #${workspace.id} is not equal to member.team_id as ${member.team_id}`)
        }

        user.workspace = workspace; //await teamRepository.findOne(member.team_id);

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

  private async updateChannels(workspace: SlackWorkspace) {
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
      .where({workspace: workspace.id})
      .set({isArchived: true})
      .execute()

    for (const channel of conversations) {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
      }

      ch.isEnabled = channel.is_member;
      ch.isArchived = channel.is_archived;
      ch.createdBy = await userRepository.findOne(channel.creator);
      if (!ch.createdBy) {
        this.logger.error(`Created by is not found`);

        continue;
      }
      ch.workspace = workspace
      if (!ch.workspace) {
        this.logger.error(`Created by is not found`);
        continue;
      }

      ch.name = channel.name
      ch.nameNormalized = channel.name_normalized
      await channelRepository.save(ch);
      await this.updateChannelMembers(ch);
      await channelRepository.save(ch);
    }
  }

  async updateWorkspace(workspace: SlackWorkspace): Promise<SlackWorkspace> {
    // https://api.slack.com/methods/team.info
    const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({team: workspace.id})) as any;
    workspace.name = teamInfo.team.name;``
    workspace.domain = teamInfo.team.domain

    return await this.connection.getRepository(SlackWorkspace).save(workspace)
  }

  async updateChannelMembers(channel: Channel) {
    const userRepository = this.connection.getRepository(User);
    let membersResponse = await this.webClient.conversations.members({channel: channel.id}) as { ok: boolean, members?: string[], error?: string };
    if (!membersResponse.ok) {
      throw new Error(membersResponse.error);
    }

    channel.users = []
    if (membersResponse.members.length > 0) {
      channel.users = await userRepository.createQueryBuilder('u').whereInIds(membersResponse.members).getMany() // TODO
    }
  }

  async handleInteractiveAnswers(response: InteractiveResponse) {
    const user = await this.connection.getRepository(User).findOne(response.user.id);

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

    const inProgress = !standUp.isFinished(); // has not standUp.endAt?!

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg);
      return;
    }

    const selectedActions = response.actions.map(a => a.value);

    const msgDate = new Date(parseInt(response.action_ts) * 1000);

    if (selectedActions.includes(ACTION_START)) {
      this.agreeToStartSubject.next({user, date: msgDate}); // TODO local time should be same from slack sever, have shift then cant find standup, consider shift in bot service
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
      let element: any
      element = {
        name: question.index,
        label: question.text.length > 24 ? question.text.slice(0, 21) + '...' : question.text,
      }
      if (question.options.length > 1) {
        element = {
          ...element,
          type: "select",
          options: question.options.map((pa) => ({
            label: pa.text,
            value: pa.id
          })),
        };
      } else {
        element = {
          ...element,
          type: "textarea", // https://api.slack.com/dialogs#textarea_elements
          placeholder: question.text,
        }
      }


      const answer = answers[question.index];
      if (answer) {
        element.value = answer.answerMessage;
      }

      openDialogRequest.dialog.elements.push(element);
    }

    this.logger.debug('Call webClient.dialog.open', {dialog: openDialogRequest})
    try {
      await this.webClient.dialog.open(openDialogRequest)
    } catch (e) {
      this.logger.error(e.message, {
        error: e
      })
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
      this.logger.error(`There is no handler for callback`, {response});
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

    if (!user) {
      throw new Error(`Channel team ${response.channel.id} is not found`)
    }

    const messages: IMessage[] = []
    const msgDate = new Date(parseInt(response.action_ts) * 1000);

    for (const index of Object.keys(response.submission).sort((current, next) => current > next ? 1 : -1)) {
      const text = response.submission[index]
      messages.push({
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
    const inProgress = !standUp.isFinished()

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg)
      return;
    }

    if (!standUp) {
      // TODO open alert?!
      await this.sendMessage(user, `I will remind you when your next standup is up!!!`);
      return;
    }

    this.batchMessagesSubject.next(messages)
  }

  async handleInteractiveDialogSubmissionResponse(response: InteractiveDialogSubmissionResponse) {
    if (response.callback_id.startsWith(CALLBACK_PREFIX_SEND_STANDUP_ANSWERS)) {
      await this.handleInteractiveDialogSubmission(response)
    } else {
      this.logger.error(`There is no handler for callback`, {response});
    }
  }

  async sendGreetingMessage(user: User, standUp: StandUp) {
    const callbackId = `${CALLBACK_PREFIX_STANDUP_INVITE}.${standUp.id}`;

    const buttonsAttachment: MessageAttachment = {
      text: "Choose start poll in chat or open dialog window",
      callback_id: callbackId,
      actions: [
        {
          name: "dialog",
          text: "Open dialog",
          type: "button",
          value: ACTION_OPEN_DIALOG
        }
      ]
    }

    const hasOptionQuestions = standUp.team.questions.filter(q => q.options.length > 0)
    //if (!hasOptionQuestions) {
    buttonsAttachment.actions.unshift({
      name: "start",
      text: "Start",
      type: "button",
      value: ACTION_START
    });
    //}

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


    await this.postMessage({
      channel: user.id,
      text: `Hello, it's time to start your #1 daily standup (${standUp.team.name})`,
      attachments: [buttonsAttachment]
    })
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
    await this.postMessage({
      channel: standUp.team.reportSlackChannel,
      text,
      attachments
    })
  }

  private async postMessage(args: ChatPostMessageArguments): Promise<any> {
    this.logger.debug('Call webClient.chat.postMessage', args)
    return this.webClient.chat.postMessage(args);
  }

  async sendMessage(user: User, message: string): Promise<any> {
    const args: ChatPostMessageArguments = {text: message, channel: user.id}
    await this.postMessage(args);
  }
}
