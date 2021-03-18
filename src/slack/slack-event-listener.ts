import {Inject} from "injection-js";
import {LOGGER_TOKEN} from "../services/token";
import {QUEUE_NAME_SLACK_EVENTS} from "../services/providers";
import {MessageResponse} from "./model/MessageResponse";
import {ChannelLeft, MemberJoinedChannel} from "./model/SlackChannel";
import {ScopeGranted} from "./model/ScopeGranted";
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

export class SlackEventListener {
  evensHandlers: {[event:string]: Function} = {
    message: async (messageResponse: MessageResponse) => {
      const userRepository = this.connection.getRepository(User);
      // be sure it is direct answerMessage to bot
      /*if (!await userRepository.findOne({where: {im: messageResponse.channel}})) {
        this.logger.error(`User channel ${messageResponse.channel} is not im`);
        // TODO try update from api
        return true
      }*/

      // const eventAt = new Date(parseInt(messageResponse.event_ts) * 1000)
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

      this.slackBotTransport.sendMessage(user, "Click \"Open dialog\" above")
    },
    error: (data) => this.logger.error('Receive slack events error', {error: data}),
    /*member_left_channel: async (response: MemberJoinedChannel) => {
    },*/
    member_joined_channel: async (response: MemberJoinedChannel) => {
      const workspaceRepository = this.connection.getRepository(SlackWorkspace)

      let workspace = (await workspaceRepository.findOne(response.team)) || workspaceRepository.create({id: response.team});
      workspace = await this.syncSlackService.updateWorkspace(workspace, 'TODO')
      await this.syncSlackService.joinSlackChannel(response.channel, {
        workspace: workspace
      });
    },
    channel_joined: (data) => this.syncSlackService.channelJoined(data),
    group_joined: (data) => this.syncSlackService.channelJoined(data),
    channel_left: (data) => {
      const response = data as ChannelLeft
      this.syncSlackService.findOrCreateAndUpdate(response.channel, {isEnabled: false})
    },
    group_left: (data) => {
      const channel: string = data.channel;
      this.syncSlackService.findOrCreateAndUpdate(channel, {isEnabled: false})
    },
    channel_archive: (data) => {
      const channel: string = data.channel;
      this.syncSlackService.findOrCreateAndUpdate(channel, {isArchived: true})
    },
    group_archive: (data) => {
      const channel: string = data.channel;
      this.syncSlackService.findOrCreateAndUpdate(channel, {isArchived: true})
    },
    channel_unarchive: (data) => {
      const channel: string = data.channel;
      this.syncSlackService.findOrCreateAndUpdate(channel, {isArchived: false})
    },
    group_unarchive: (data) => {
      const channel: string = data.channel;
      this.syncSlackService.findOrCreateAndUpdate(channel, {isArchived: false})
    }
  }

  private standUpRepository: StandUpRepository;

  constructor(
    @Inject(SlackEventAdapter) private slackEvents: SlackEventAdapter,
    private slackBotTransport: SlackBotTransport,
    private syncSlackService: SyncSlackService,
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
      this.slackEvents.on(event, (data) => {
         this.queueRegistry.create(QUEUE_NAME_SLACK_EVENTS).add(event, data);
      })
    }

    this.slackEvents.on('error', (error) => {
      this.logger.error('Slack event error', error)
    })
  }



  public handleEventJob(event: string, data: any) {
    this.evensHandlers[event](data);
  }

  public async handleAction(action: SlackAction) {
    const user = await this.connection.getRepository(User).findOne(action.user.id);

    if (!user) {
      throw new Error(`User ${action.user.id} is not found`)
    }

    if (action.actions.length !== 1) {
      this.logger.warn('Inconsistent actions length', {action})
    }

    /*const startAction = response.actions.find(a => a.action_id === ACTION_START);
    if (startAction) {
      // TODO local time should be same from slack sever, have shift then cant find standup, consider shift in bot service
      this.startConfirmSubject.next({user, date: msgDate})
      return
    }*/

    const openReportAction = action.actions.find(a => a.action_id === ACTION_OPEN_REPORT);

    if (openReportAction) {
      const standUpId = parseInt(openReportAction.value);
      if (!standUpId) {
        throw new Error(`Standup standUpId is not defined ${openReportAction.value}`)
      }

      const standUp = await this.standUpRepository.standUpByIdAndUser(user, standUpId);

      if (!standUp) {
        throw new Error(`Standup #${standUpId} is not found`)
      }

      this.slackBotTransport.openReport(standUp, action.trigger_id);

      return;
    }

    const openDialogAction = action.actions.find(a => a.action_id === ACTION_OPEN_DIALOG);
    if (!openDialogAction) {
      throw new Error(`${ACTION_OPEN_DIALOG} action is not found in list of action from interactive response`); // TODO save response
    }

    const standUpId = parseInt(openDialogAction.value);

    if (!standUpId) {
      throw new Error(`Standup standUpId is not defined ${openDialogAction.value}`)
    }

    // TODO already submit
    // const standUp = await this.findByUser(user);

    const standUp = await this.standUpRepository.standUpByIdAndUser(user, standUpId);

    if (!standUp) {
      throw new Error(`Standup #${standUpId} is not found`)
    }

    //const openDialogTs = new Date(parseInt(openDialogAction.action_ts) * 1000);
    this.slackBotTransport.openDialog(user, standUp, action.trigger_id);
  }

  async handleViewSubmission(viewSubmission: ViewSubmission) {
    const user = await this.connection.getRepository(User).findOne(viewSubmission.user.id);

    // TODO  if (viewSubmission.trigger_id !== CALLBACK_STANDUP_SUBMIT) {
    //  throw new Error('Wrong response');
    //}

    if (!user) {
      throw new Error(`User ${viewSubmission.user.id} is not found`)
    }

    //viewSubmission.view.private_metadata
    //const msgDate = new Date(parseInt(viewSubmission.ts) * 1000);

    const metadata = JSON.parse(viewSubmission.view.private_metadata);
    const standup = await this.standUpRepository.standUpByIdAndUser(user, metadata.standup)
    if (!standup) {
      // TODO
      throw new Error('No standup #' + metadata.standup)
    }

    let values: any = viewSubmission.view.state.values
    values = Object.assign({}, ...Object.values(values));

    const answers: AnswerRequest[] = [];
    for(const actionId in values) {
      const item = values[actionId];
      const question = await this.connection.getRepository(QuestionSnapshot).findOne(parseInt(actionId));
      if (!question) {
        throw new ContextualError('Question snapshot is not found', {actionId})
      }
      const hasOptions = question.options.length > 1
      const value = hasOptions ? item.selected_option.value : item.value
      let answer = standup.answers.find(answer => answer.question.id === question.id)
      if (!answer) {
        answer = new AnswerRequest()
        answer.question = question;
        answer.user = user; // TODO check it is not nullable!
        answer.standUp = standup; // TODO check it is not nullable!
      } else {
        if (answer.question.id !== question.id) {
          // TODO throw?
        }
        if (answer.user.id !== user.id) {
          // TODO throw?
        }
      }

      if (hasOptions) {
        answer.option = question.options.find(o => o.id === parseInt(value))
      } else {
        answer.answerMessage = value;
      }

      answers.push(answer)
    }

    if (answers.length > 0) {
      const updatedanswers = await this.connection.getRepository(AnswerRequest).save(answers)
    }
  }
}