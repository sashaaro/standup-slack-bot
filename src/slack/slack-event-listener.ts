import {Inject} from "injection-js";
import {LOGGER_TOKEN} from "../services/token";
import {QUEUE_NAME_SLACK_EVENTS} from "../services/providers";
import {MessageResponse} from "./model/MessageResponse";
import {ChannelLeft, MemberJoinedChannel} from "./model/SlackChannel";
import SlackWorkspace from "../model/SlackWorkspace";
import {SlackEventAdapter} from "@slack/events-api/dist/adapter";
import {Logger} from "winston";
import User from "../model/User";
import {ACTION_OPEN_DIALOG, ACTION_OPEN_REPORT, SlackBotTransport} from "./slack-bot-transport.service";
import {Connection} from "typeorm";
import {SlackAction, ViewSubmission} from "./model/ViewSubmission";
import AnswerRequest from "../model/AnswerRequest";
import {StandUpRepository} from "../repository/standup.repository";
import {SyncSlackService} from "./sync-slack.service";
import {QueueRegistry} from "../services/queue.registry";
import {ContextualError} from "../services/utils";
import QuestionSnapshot from "../model/QuestionSnapshot";
import {greetingBlocks} from "./slack-blocks";

export class SlackEventListener {
  evensHandlers: {[event:string]: (data: any) => Promise<any>|any} = {
    message: async (messageResponse: MessageResponse) => { // todo insert db?!
      const user = await this.connection.getRepository(User).findOne(messageResponse.user)

      if (!user) { // TODO skip bot message
        throw new ContextualError('Message author is not found', { messageResponse })
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

      return await this.slackBotTransport.sendMessage(user, "Click \"Open dialog\" above")
    },
    error: (data) => this.logger.error('Receive slack events error', {error: data}),
    member_left_channel: async (response: MemberJoinedChannel) => { // TODO left interface
      const workspaceRepository = this.connection.getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.syncSlack.updateWorkspace(workspace)
      await this.syncSlack.joinSlackChannel(response.channel, {
        workspace: workspace
      });
    },
    member_joined_channel: async (response: MemberJoinedChannel) => {
      const workspaceRepository = this.connection.getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.syncSlack.updateWorkspace(workspace)
      await this.syncSlack.joinSlackChannel(response.channel, {
        workspace: workspace
      });
    },
    channel_joined: (data) => this.syncSlack.channelJoined(data),
    group_joined: (data) => this.syncSlack.channelJoined(data),
    channel_left: (data: ChannelLeft) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isEnabled: false}),
    group_left: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isEnabled: false}),
    channel_archive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: true}),
    group_archive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: true}),
    channel_unarchive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: false}),
    group_unarchive: (data: {channel: string}) => this.syncSlack.findOrCreateAndUpdate(data.channel, {isArchived: false})
  }

  private standUpRepository: StandUpRepository;

  constructor(
    @Inject(SlackEventAdapter) private slackEvents: SlackEventAdapter,
    private slackBotTransport: SlackBotTransport,
    private syncSlack: SyncSlackService,
    private queueRegistry: QueueRegistry,
    private connection: Connection,
    @Inject(LOGGER_TOKEN) private logger: Logger,
  ) {
  }

  initSlackEvents(): void {
    this.standUpRepository = this.connection.getCustomRepository(StandUpRepository)
    // https://api.slack.com/events/scope_granted
    // this.slackEvents.on('scope_granted', async (scopeGranted: ScopeGranted) => {
    //   this.logger.info(`Scope granted for team`, {team: scopeGranted.team_id})
    //
    //   let workspace = await this.connection.getRepository(SlackWorkspace).findOne(scopeGranted.team_id);
    //   if (!workspace) {
    //     workspace = new SlackWorkspace();
    //     workspace.id = scopeGranted.team_id;
    //     this.syncSlackService.updateWorkspace(workspace, 'TODO')
    //   }
    // })

    for (const event in this.evensHandlers) {
      const handler = this.evensHandlers[event]
      handler.bind(this);
      this.slackEvents.on(event, async (data) => {
        try {
          await this.queueRegistry.create(QUEUE_NAME_SLACK_EVENTS).add(event, data);
        } catch (error) {
          this.logger.error('Add job error', {event, data})
        }
      })
    }

    this.slackEvents.on('error', (error) => {
      this.logger.error('Slack event error', error)
    })
  }

  public handleEventJob(event: string, data: any): Promise<void> {
    const r = this.evensHandlers[event](data);
    return r instanceof Promise ? r : new Promise(resolve => resolve(null))
  }

  public async handleAction(action: SlackAction) {
    if (action.actions.length !== 1) {
      this.logger.warn('Inconsistent actions length', {action})
    }

    const userId = action.user.id
    const openReportAction = action.actions.find(a => a.action_id === ACTION_OPEN_REPORT);
    const openDialogAction = action.actions.find(a => a.action_id === ACTION_OPEN_DIALOG);

    if (openReportAction) {
      const standUpId = parseInt(openReportAction.value);
      if (!standUpId) {
        throw new Error(`Standup standUpId is not defined ${openReportAction.value}`)
      }

      const userStandUp = await this.standUpRepository.findUserStandUp(userId, standUpId);

      if (!userStandUp) {
        throw new ContextualError(`User standup is not found`, {userId, standUpId})
      }

      await this.slackBotTransport.openReport(userStandUp, action.trigger_id);
    } else if (openDialogAction) {
      const standUpId = parseInt(openDialogAction.value);
      // TODO already submit

      let userStandup = await this.standUpRepository.findUserStandUp(userId, standUpId);

      if (!userStandup) {
        throw new ContextualError(`User standup is not found`, {userId, standUpId})
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
    const userStandup = await this.standUpRepository.findUserStandUp(userId, metadata.standup)
    if (!userStandup) {
      // TODO
      throw new ContextualError(`User standup is not found`, {userId, standUpId: metadata.standup})
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
    const questions = await this.connection.getRepository(QuestionSnapshot).findByIds(questionsIds, {
      relations: ['options']
    });

    if (questions.length !== questionsIds.length) {
      throw new Error('questions quantity is not same as answers') // TODO
    }

    for(const question of questions) {
      const item = values[question.id]

      const hasOptions = question.options.length > 1;

      if (hasOptions && item.type !== 'static_select') {
        this.logger.warning('wrong item type', item)
      }

      const value = hasOptions ? item.selected_option.value : item.value
      let answer = userStandup.answers.find(answer => answer.question.id === question.id)
      if (!answer) {
        answer = new AnswerRequest()
        answer.question = question
        userStandup.answers.push(answer)
        answer.userStandup = userStandup;
      }

      if (hasOptions) {
        answer.option = question.options.find(o => o.id === parseInt(value))
      } else {
        answer.answerMessage = value;
      }
    }

    await this.connection.getRepository(AnswerRequest).save(userStandup.answers);
    await this.slackBotTransport.updateMessage({
      token: 'xoxb-646242827008-1873129895365-hoUmeZfd4ZIgStbKKH5Ct7X0',
      ts: '1616350254.002200',
      channel: 'D01RSCDLNM9',
      ...greetingBlocks(userStandup.standUp, true),
    })
  }
}