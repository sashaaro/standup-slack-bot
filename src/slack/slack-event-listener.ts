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
import UserStandup from "../model/UserStandup";

export class SlackEventListener {
  evensHandlers: {[event:string]: (data: any) => Promise<any>|any} = {
    message: async (messageResponse: MessageResponse) => {
      const user = await this.connection.getRepository(User).findOne(messageResponse.user)

      if (!user) {
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
    /*member_left_channel: async (response: MemberJoinedChannel) => {
    },*/
    member_joined_channel: async (response: MemberJoinedChannel) => {
      const workspaceRepository = this.connection.getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.syncSlack.updateWorkspace(workspace, 'TODO')
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

      const standUp = await this.standUpRepository.findUserStandUp(userId, standUpId);

      if (!standUp) {
        throw new ContextualError(`User standup is not found`, {userId, standUpId})
      }

      await this.slackBotTransport.openReport(standUp, action.trigger_id);
    } else if (openDialogAction) {
      const standUpId = parseInt(openDialogAction.value);
      // TODO already submit

      const standUp = await this.standUpRepository.findByIdAndUser(userId, standUpId);

      if (!standUp) {
        throw new ContextualError(`User standup is not found`, {userId, standUpId})
      }

      const userStandup = new UserStandup()
      userStandup.standUp = standUp;
      userStandup.user = await this.connection.getRepository(User).findOne(userId);

      if (!userStandup.user) {
        throw new ContextualError(`User is not found`, {userId})
      }

      //const openDialogTs = new Date(parseInt(openDialogAction.action_ts) * 1000);
      userStandup.slackMessage = await this.slackBotTransport.openDialog(userStandup, action.trigger_id);
      await this.connection.manager.insert(UserStandup, userStandup)
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

    const standup = userStandup.standUp

    const questionsIds = Object.values(viewSubmission.view.state.values).map(v => parseInt(v));
    const questions = await this.connection.getRepository(QuestionSnapshot).findByIds(questionsIds, {
      relations: ['options']
    });
    if (questions.length !== questionsIds.length) {
      throw new Error('questions quantity is not same as answers') // TODO
    }

    for(const question of questions) {
      const item = viewSubmission.view.state.values[question.id] as any;

      if (!item) {
        throw new Error('not found answer by question id') // TODO
      }

      const hasOptions = question.options.length > 1
      const value = hasOptions ? item.selected_option.value : item.value
      let answer = userStandup.answers.find(answer => answer.question.id === question.id)
      if (!answer) {
        answer = new AnswerRequest()
        answer.question = question;
        userStandup.answers.push(answer)
      }

      if (hasOptions) {
        answer.option = question.options.find(o => o.id === parseInt(value))
      } else {
        answer.answerMessage = value;
      }
    }

    if (userStandup.answers.length > 0) {
      const result = await this.connection.getRepository(AnswerRequest).save(userStandup.answers);
      //
    }
  }
}