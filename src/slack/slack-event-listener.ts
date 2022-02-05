import {Inject} from "injection-js";
import {em, QUEUE_NAME_SLACK_EVENTS} from "../services/providers";
import {MessageResponse} from "./model/MessageResponse";
import {ChannelLeft, MemberJoinedChannel} from "./model/SlackChannel";
import SlackWorkspace from "../entity/slack-workspace";
import pino from "pino";
import {Standup, User} from "../entity";
import {ACTION_OPEN_DIALOG, SlackBotTransport} from "./slack-bot-transport.service";
import {SlackAction, ViewSubmission} from "./model/ViewSubmission";
import AnswerRequest from "../entity/answer-request";
import {SyncSlackService} from "./sync-slack.service";
import {QueueRegistry} from "../services/queue.registry";
import {ContextualError, HasPreviousError} from "../services/utils";
import QuestionSnapshot from "../entity/question-snapshot";
import {generateStandupMsg} from "./slack-blocks";
import {LOG_TOKEN} from "../services/token";
import {StandupRepository} from "../repository/standupRepository";
import {ChatUpdateArguments, WebClient} from "@slack/web-api";
import {response} from "express";

interface IEventHandler {
  (data: any): Promise<any>|any
}

export class MessageUserNotFoundError extends HasPreviousError {
  constructor(message?: string, public messageResponse?: MessageResponse) {
    super(message);
  }
}

export class SlackEventListener {
  evensHandlers: {[event:string]: IEventHandler} = {
    message: async (messageResponse: MessageResponse) => { // todo insert db?!
      if (messageResponse.bot_id) {
        this.logger.debug('Bot message received. Skipped')
        return;
      } else if (messageResponse.subtype) {
        this.logger.debug('Sub type message received. Skiped')
        return;
      }

      const user = await em().getRepository(User).findOne({id: messageResponse.user}, ['workspace'])

      if (!user) { // TODO skip bot message
        throw new MessageUserNotFoundError('Message author is not found', messageResponse)
      }

      // try {
      // } catch (e) {
      //   if (e instanceof InProgressStandUpNotFoundError) {
      //     this.logger.info('Attempt send answer to for ended standup', {error: e});
      //     await this.send(message.user, standUpWillRemindYouNextTime)
      //     return;
      //   } else if (e instanceof AlreadySubmittedStandUpError) {
      //     await this.send(message.user, `You've already submitted your standup for today.`)
      //     return;
      //   } else if (e instanceof NeedOpenDialogStandUpError) {
      //     this.send(message.user, "Click \"Open dialog\" above")
      //   } else if (e instanceof OptionNotFoundError) {
      //     this.logger.error('Option is not found', {error: e});
      //   } else {
      //     this.logger.error('Error answer', {error: e});
      //     return;
      //   }
      // }
      
      return await this.slackBotTransport.sendMessage(user, `I will remind you next time for standup`); // TODO more info
    },
    error: (data) => this.logger.error(data, 'Receive slack events error'),
    member_left_channel: async (response: MemberJoinedChannel) => { // TODO left interface
      const workspaceRepository = em().getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.syncSlack.updateWorkspace(workspace) // why?
      await this.syncSlack.joinSlackChannel(response.channel, {
        workspace: workspace
      });
    },
    member_joined_channel: async (response: MemberJoinedChannel) => {
      const workspaceRepository = em().getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.syncSlack.updateWorkspace(workspace) // why?
      await this.syncSlack.joinSlackChannel(response.channel, {
        workspace: workspace
      });
    },
    app_home_opened: async (response) => {
      // TODO
      //console.log(response)
      const {type, user, channel, tab, text, subtype} = response;

      // this.webClient.views.publish({
      //   user_id: user
      //   token:
      // })
    },
    channel_joined: (data) => this.syncSlack.channelJoined(data),
    group_joined: (data) => this.syncSlack.channelJoined(data),
    channel_left: (data: ChannelLeft) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isEnabled: false}),
    group_left: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isEnabled: false}),
    channel_archive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: true}),
    group_archive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: true}),
    channel_unarchive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: false}),
    group_unarchive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: false}),
  }

  constructor(
    private slackBotTransport: SlackBotTransport,
    private syncSlack: SyncSlackService,
    private queueRegistry: QueueRegistry,
    @Inject(LOG_TOKEN) private logger: pino.Logger,
    private webClient: WebClient
  ) {
    for (const event in this.evensHandlers) {
      const handler = this.evensHandlers[event]
      handler.bind(this);
    }
  }

  public events() {
    return Object.keys(this.evensHandlers)
  }

  public handleEventJob(event: string, data: any): Promise<void> {
    const r = this.evensHandlers[event](data);
    return r instanceof Promise ? r : new Promise(resolve => resolve(null))
  }

  public async handleAction(action: SlackAction) {
    if (action.actions.length !== 1) {
      this.logger.warn({action}, 'Inconsistent actions length')
    }

    const userId = action.user.id
    const openDialogAction = action.actions.find(a => a.action_id === ACTION_OPEN_DIALOG);

    const standupRepo = em().getRepository(Standup) as StandupRepository
    if (openDialogAction) {
      const standupId = parseInt(openDialogAction.value);
      // TODO already submit

      let userStandup = await standupRepo.findUserStandup(userId, standupId);
      if (!userStandup) {
        throw new ContextualError(`User standup is not found`, {userId, standupId})
      }

      await this.slackBotTransport.openDialog(userStandup, action.trigger_id);
    } else {
      throw new Error(`${ACTION_OPEN_DIALOG} action is not found in list of action from interactive response`); // TODO save response
    }
  }

  async handleViewSubmission(viewSubmission: ViewSubmission) {
    const userId = viewSubmission.user.id;

    //viewSubmission.view.private_metadata
    //const msgDate = new Date(parseInt(viewSubmission.ts) * 1000);

    const metadata = JSON.parse(viewSubmission.view.private_metadata);
    const standupRepo = em().getRepository(Standup) as StandupRepository

    const userStandup = await standupRepo.findUserStandup(userId, metadata.standup)
    if (!userStandup) {
      // TODO
      throw new ContextualError(`User standup is not found`, {userId, standupId: metadata.standup})
    }

    const values: {[questionId: string]: {
        type: 'plain_text_input'|'static_select',
        value?: string,
        selected_option?: {
          text: {
            type: 'plain_text',
            text: string,
            emoji: boolean
          },
          value: string
        }
    }} = Object.assign({}, ...Object.values(viewSubmission.view.state.values));

    const questionsIds = Object.keys(values).map(v => parseInt(v)).filter(v => v);
    if (questionsIds.length !== Object.values(viewSubmission.view.state.values).length) {
      throw new ContextualError('question answer are wrong', viewSubmission)
    }

    if (questionsIds.length === 0) {
      throw new ContextualError('question answers equals zero', viewSubmission)
    }

    const questions = await em().find(
      QuestionSnapshot,
      {id: {$in: questionsIds}},
      ['options']
    );

    if (questions.length !== questionsIds.length) {
      throw new Error('questions quantity is not same as answers') // TODO
    }

    for(const question of questions) {
      const item = values[question.id]

      const hasOptions = question.options.length > 1;

      if (hasOptions && item.type !== 'static_select') {
        this.logger.warn(item, 'wrong item type')
      }

      const value = hasOptions ? item.selected_option.value : item.value
      let answer = userStandup.answers.getItems().find(answer => answer.question.id === question.id)
      if (!answer) {
        answer = new AnswerRequest()
        answer.question = question
        userStandup.answers.add(answer)
        answer.userStandup = userStandup;
      }

      if (hasOptions) {
        answer.option = question.options.getItems().find(o => o.id === parseInt(value))
      } else {
        answer.answerMessage = value;
      }
    }

    await em().persistAndFlush(userStandup.answers.getItems());
    await this.slackBotTransport.updateMessage({
      token: userStandup.standup.team.originTeam.workspace.accessToken,
      ts: userStandup.slackMessage.ts,
      channel: userStandup.slackMessage.channel,
      ...generateStandupMsg(userStandup.standup, true),
    } as ChatUpdateArguments)
  }
}