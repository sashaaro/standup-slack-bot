import {Inject, Injectable} from "injection-js";
import {Observable, Subject} from "rxjs";
import {IMessage, ITransport, IUser} from "../bot/models";
import User from "../model/User";
import {ChannelRepository} from "../repository/ChannelRepository";
import {Connection, DeepPartial} from "typeorm";
import {SlackConversation} from "./model/SlackChannel";
import {SlackIm} from "./model/ScopeGranted";
import SlackWorkspace from "../model/SlackWorkspace";
import {
  ACTION_OPEN_DIALOG, ACTION_OPEN_REPORT,
  CALLBACK_STANDUP_SUBMIT,
  SlackStandUpProvider
} from "./SlackStandUpProvider";
import {SlackTeam} from "./model/SlackTeam";
import AnswerRequest from "../model/AnswerRequest";
import StandUp from "../model/StandUp";
import groupBy from "lodash.groupby";
import {
  ChatPostMessageArguments,
  WebAPICallResult,
  WebClient
} from '@slack/web-api'
import {ISlackUser} from "./model/SlackUser";
import {LOGGER_TOKEN} from "../services/token";
import {Logger} from "winston";
import {Channel} from "../model/Channel";
import {Block, KnownBlock} from "@slack/types";

const standUpFinishedAlreadyMsg = `Standup #{id} has already ended\nI will remind you when your next stand up would came`; // TODO link to report

export const hasOptionQuestions = (team) => team.questions.filter(q => q.options.length > 0)

@Injectable()
export class SlackBotTransport implements ITransport {
  private startConfirmSubject = new Subject<{user: IUser, date: Date}>();
  private batchMessagesSubject = new Subject<IMessage[]>();

  startConfirm$ = this.startConfirmSubject.asObservable();
  message$ = new Subject<IMessage>();
  batchMessages$: Observable<IMessage[]> = this.batchMessagesSubject.asObservable();

  constructor(
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private webClient: WebClient,
    private connection: Connection,
    private slackStandUpProvider: SlackStandUpProvider,
  ) {
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

  async joinSlackChannel(channelID: string, data?: DeepPartial<Channel>) {
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

    this.updateUsers(workspace);
    this.updateChannels(workspace);
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
      // TODO sql batch update
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

    for (const channel of conversations.filter(ch => !ch.is_member)) {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
      }

      ch.isEnabled = true;
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

  async openReport(standUp: StandUp, triggerId: string) {
    if (false) {
      // check in progress
    }
    const view = {
      type: "modal",
      title: {
        "type": "plain_text",
        "text": `Report #${standUp.team.name}`,
        "emoji": true
      },
      "close": {
        "type": "plain_text",
        "text": "Cancel",
        "emoji": true
      },
      //callback_id: CALLBACK_STANDUP_SUBMIT,
      //private_metadata: JSON.stringify({standup: standUp.id}),
      blocks: []
    };

    view.blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*!!!* sdfdsf'`
      }
    })

    const args:any = {
      view: view,
      trigger_id: triggerId,
    }
    const r = await this.webClient.views.open(args)
  }
  async openDialog(user: User, standUp: StandUp, triggerId: string) {
    const inProgress = !standUp.isFinished(); // has not standUp.endAt?!

    if (!inProgress) { // in progress only..
      //await this.sendMessage(user, standUpFinishedAlreadyMsg.replace('{id}', standUp.id.toString()));
      //await this.sendGreetingMessage(user, standUp);
      //return;
    }

    const answers = standUp.answers.filter(a => a.user.id === user.id);

    const view = {
      type: "modal",
      title: {
        "type": "plain_text",
        "text": `Standup #${standUp.team.name}`,
        "emoji": true
      },
      "submit": {
        "type": "plain_text",
        "text": answers.length > 0 ? "Update" : "Submit",
        "emoji": true
      },
      "close": {
        "type": "plain_text",
        "text": "Cancel",
        "emoji": true
      },
      callback_id: CALLBACK_STANDUP_SUBMIT,
      private_metadata: JSON.stringify({standup: standUp.id}),
      blocks: []
    };

    if (!inProgress) {
      delete view.submit
    }

    for (const question of standUp.team.questions) {
      const answer = answers.find(answer => answer.question.id === question.id);

      const hasOptions = question.options.length > 1;
      const element: any = {
        type: hasOptions ?  "static_select" : "plain_text_input",
        action_id: question.id.toString(),
      };


      if (inProgress) {
        if (hasOptions) {
          element.placeholder = {
            "type": "plain_text",
            "text": "Select an item",
            "emoji": true
          }

          element.options = question.options.map(pa => ({
            text: {
              "type": "plain_text",
              "text": pa.text,
              "emoji": true
            },
            value: pa.id.toString()
          }));
        } else {
          element.multiline = true;
          element.min_length = 2;
          element.max_length = 500;
        }

        if (answer) {
          if (hasOptions) {
            //element.value = answer.option.id
            element.initial_option = element.options.find(option => option.value === answer.option.id.toString());
            if (!element.initial_option) {
              // TODO warming
            }
          } else {
            element.initial_value = answer.answerMessage;
          }
        }

        view.blocks.push({
          type: "input",
          label: {
            "type": "plain_text",
            "text": question.text,
            "emoji": true
          },
          element,
          //block_id: question.id.toString()
        })
      } else {
        view.blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*${question.text}*\n${(hasOptions ? answer.option?.text : answer.answerMessage) || '-'}`
          }
        })
      }

      const isLast = question === standUp.team.questions[standUp.team.questions.length]
      if (!isLast) {
        view.blocks.push({
          type: "divider"
        })
      }
    }

    if (!inProgress) {
      view.blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Standup was in end"
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Open report",
            "emoji": true
          },
          "value": standUp.id.toString(),
          "action_id": ACTION_OPEN_REPORT
        }
      })
    } else {
      //markdown support todo // https://api.slack.com/reference/surfaces/formatting !
    }

    const args:any = {
      view: view,
      trigger_id: triggerId,
    }
    this.logger.debug('Call webClient.views.open', {args: args})
    try {
      await this.webClient.views.open(args)
    } catch (e) {
      this.logger.error(e.message, {
        error: e
      })
      throw new Error(e.message)
    }
  }

  async handleSubmittedStandUp(user: User, createdAt: Date) {
    const messages: IMessage[] = []
    const response: any = {}
    for (const index of Object.keys(response.submission).sort((current, next) => current > next ? 1 : -1)) {
      const text = response.submission[index]
      messages.push({
        text: text,
        user: user,
        createdAt: createdAt
      } as IMessage)
    }

    const dialogState = JSON.parse(response.state)

    if (typeof dialogState !== 'object' && !dialogState.standup) {
      throw new Error(`Dialog state "${response.state}" is wrong format`)
    }

    const standUp = await this.slackStandUpProvider.standUpByIdAndUser(user, dialogState.standup);
    const inProgress = !standUp.isFinished()

    if (!inProgress) { // in progress only..
      await this.sendMessage(user, standUpFinishedAlreadyMsg.replace('{id}', standUp.id.toString()))
      return;
    }

    if (!standUp) {
      // TODO open alert?!
      await this.sendMessage(user, `I will remind you when your next standup is up!!!`);
      return;
    }

    this.batchMessagesSubject.next(messages)
  }

  async sendGreetingMessage(user: User, standUp: StandUp) {
    const fallbackText =  `It's time to start your daily standup ${standUp.team.name}`;

    const blocks: (KnownBlock | Block)[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hello, it's time to start your daily standup *${standUp.team.name}*`,
        },
      },
      {
        type: 'actions',
        elements: [
          // hasOptionQuestions
          /*{
            type: "button",
            text: {
              text: 'Start',
              type: 'plain_text'
            },
            value: ACTION_START,
            action_id: "1",
          },*/
          {
            type: "button",
            style: 'primary',
            text: {
              type: 'plain_text',
              text: 'Open dialog',
            },
            action_id: ACTION_OPEN_DIALOG,
            value: standUp.id.toString(),
          }
        ]
      }
    ];


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


    const result = await this.postMessage({
      channel: user.id,
      text: fallbackText,
      blocks: blocks,
    });
  }

  async sendReport(standUp: StandUp) {
    let text = `Standup complete `

    const blocks: any[] = [
      {
        type: "header",
        "text": {
          "type": "plain_text",
          "text": text,
          "emoji": true
        }
      }
    ]

    const userAnswers = groupBy(standUp.answers, 'user.id');
    const users = standUp.answers.map(a => a.user);
    for (const user of standUp.team.users) {
      let body = '';
      for (const question of standUp.team.questions) {
        // const index = standUp.team.questions.indexOf(question);
        const answer = standUp.answers.find(a => a.user.id === user.id && a.question.id == question.id);
        const hasOptions = question.options.length
        body += `*${question.text}*\n${(hasOptions ? answer.option?.text : answer.answerMessage) || '-'}\n`
      }

      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": body
        },
        ...(user.profile?.image_192 ? {"accessory": {
            "type": "image",
            "image_url": user.profile.image_192,
            "alt_text": "alt text for image"
          }} : {})
      })

      blocks.push({
        type: "divider"
      })
    }


    if (userAnswers.length === 0) {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": 'Nobody sent answers 🐥'
        }
      })
    }
    await this.postMessage({
      channel: standUp.team.reportSlackChannel,
      text,
      blocks
    })
  }

  private async postMessage(args: ChatPostMessageArguments): Promise<WebAPICallResult> {
    this.logger.debug('Call webClient.chat.postMessage', args)
    return await this.webClient.chat.postMessage(args);
  }

  async sendMessage(user: User, message: string): Promise<any> {
    const args: ChatPostMessageArguments = {text: message, channel: user.id}
    await this.postMessage(args);
  }
}
