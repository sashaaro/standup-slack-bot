import {Inject, Injectable} from "injection-js";
import {Standup, User, UserStandup} from "../entity";
import {
  ChatPostMessageArguments,
  ChatUpdateArguments,
  WebClient
} from '@slack/web-api'
import {Logger} from "pino";
import {ContextualError, isPlatformError} from "../services/utils";
import {MessageResult} from "./model/MessageResult";
import {OpenViewResult} from "./model/OpenViewResult";
import {generateStandupMsg} from "./slack-blocks";
import {LOG_TOKEN} from "../services/token";

export const hasOptionQuestions = (team) => team.questions.filter(q => q.options.length > 0)

export const CALLBACK_STANDUP_SUBMIT = 'standup_submit'
export const ACTION_OPEN_DIALOG = 'open_dialog'
export const ACTION_OPEN_REPORT = 'open_report'


@Injectable()
export class SlackBotTransport {
  constructor(
    @Inject(LOG_TOKEN) private logger: Logger,
    private webClient: WebClient
  ) {
  }

  async openReport(userStandup: UserStandup, triggerId: string) {
    const standup = userStandup.standup
    if (false) {
      // check in progress
    }
    const view = {
      type: "modal",
      title: {
        "type": "plain_text",
        "text": `Report #${standup.team.originTeam.name}`.substr(0, 24).trim(),
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
    this.logger.debug(args, 'Call webClient.views.open')

    const r = await this.webClient.views.open({
      ...args,
      token: standup.team.originTeam.workspace.accessToken
    })
  }

  async openDialog(userStandup: UserStandup, triggerId: string): Promise<OpenViewResult['view']> {
    const inProgress = !userStandup.standup.isFinished();

    const view: any = {
      type: "modal",
      title: {
        "type": "plain_text",
        "text": `Standup #${userStandup.standup.team.originTeam.name}`.substr(0, 24).trim(),
        "emoji": true
      },
      close: {
        "type": "plain_text",
        "text": "Cancel",
        "emoji": true
      },
      callback_id: CALLBACK_STANDUP_SUBMIT,
      private_metadata: JSON.stringify({standup: userStandup.standup.id}), // userStandup.id?!
      blocks: []
    };

    if (inProgress) {
      view.submit = {
        "type": "plain_text",
          "text": userStandup.answers.length > 0 ? "Update" : "Submit",
          "emoji": true
      }
    }

    const standup = userStandup.standup

    for (const question of standup.team.questions.getItems()) {
      const answer = userStandup.answers.getItems().find(answer => answer.question.id === question.id);

      const hasOptions = question.options.length > 1;
      const element: any = {
        type: hasOptions ?  "static_select" : "plain_text_input",
        action_id: question.id.toString(),
      }

      if (inProgress) {
        if (hasOptions) {
          element.placeholder = {
            "type": "plain_text",
            "text": "Select an item",
            "emoji": true
          }

          element.options = question.options.getItems().map(pa => ({
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
        const text = `*${question.text}*\n${(hasOptions ? answer?.option?.text : answer?.answerMessage) || '-'}`
        view.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text
          }
        })
      }

      const isLast = question === standup.team.questions[standup.team.questions.length]
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
          "value": standup.id.toString(),
          "action_id": ACTION_OPEN_REPORT
        }
      })
    } else {
      //markdown support todo // https://api.slack.com/reference/surfaces/formatting !
    }

    // TODO validate https://github.com/slackapi/slack-api-specs/blob/master/web-api/slack_web_openapi_v2.json ?!
    const args:any = {
      view: view,
      trigger_id: triggerId,
    }
    this.logger.debug(args, 'Call webClient.views.open')
    const result: OpenViewResult|any = await this.webClient.views.open({
      ...args,
      token: standup.team.originTeam.workspace.accessToken
    })

    if (!result.ok) {
      throw new ContextualError('openDialog', result)
    }

    return result.view
  }

  async sendGreetingMessage(user: User, standup: Standup): Promise<MessageResult> {
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
      ...generateStandupMsg(standup),
    } as ChatPostMessageArguments, standup.team.originTeam.workspace.accessToken);

    if (!result.ok) {
      throw new ContextualError('Send report post message error', result)
    }

    return result;
  }

  async sendReport(standup: Standup): Promise<MessageResult['message']> {
    const answersBlocks = []
    for (const userStandup of standup.users) {
      const user = userStandup.user;

      let body = '';
      for (const answer of userStandup.answers) {
        // const index = standUp.team.questions.indexOf(question);
        const question = answer.question;
        const hasOptions = answer.question.options.length
        body += `*${question.text}*\n${(hasOptions ? answer.option?.text : answer.answerMessage) || '-'}\n`
      }

      answersBlocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": body || 'No answers'
        },
        ...(user.profile?.image_192 ? {"accessory": {
            "type": "image",
            "image_url": user.profile.image_192,
            "alt_text": "alt text for image"
          }} : {})
      })

      answersBlocks.push({
        type: "divider"
      })
    }


    let text = `Standup complete `
    const headerBlock = {
      type: "header",
      "text": {
        "type": "plain_text",
        "text": text,
        "emoji": true
      }
    };
    const blocks = [
      headerBlock,
      ...(
        answersBlocks.length > 0 ?
          answersBlocks :
          [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": 'Nobody sent answers 🐥'
              }
            }
        ]
      )
    ]
    let result;

    try {
      result = await this.postMessage({
        channel: standup.team.originTeam.reportChannel.id, // TODO use from snapshot?!
        text,
        blocks,
      }, standup.team.originTeam.workspace.accessToken)
    } catch (error) {
      if (isPlatformError(error) && error.data.error === 'invalid_blocks') {
        throw error // TODO
      } else if (isPlatformError(error) && error.data.error === 'not_in_channel') {
        // TODO notify
        this.logger.info({
          channel: standup.team.originTeam.reportChannel.id,
          standup: standup.id,
        }, 'bot are not joined in report channel')
      } else {
        throw error
      }
    }

    // TODO persist standup.reportMessage = result;

    if (!result.ok) {
      throw new ContextualError('Send report post message error', result)
    }

    await Promise.all(standup.users.getItems().map((userStandup) => {
      // https://api.slack.com/docs/rate-limits ?!
      return this.updateMessage({
        token: userStandup.standup.team.originTeam.workspace.accessToken,
        ts: userStandup.slackMessage.ts,
        channel: userStandup.slackMessage.channel,
        ...generateStandupMsg(userStandup.standup, userStandup.answers.length > 0, true),
      } as ChatUpdateArguments)
    }))

    return result.message;
  }

  public async updateMessage(args: ChatUpdateArguments): Promise<MessageResult> {
    this.logger.debug(args, 'Call webClient.chat.updateMessage')
    let result: MessageResult
    //try {
      result = await this.webClient.chat.update({
        ...args
      }) as any;
    // } catch (e) {
    //   const error = new ContextualError('updateMessage', args)
    //   error.previous = e;
    //   throw error;
    // }

    if (!result.ok) {
      throw new ContextualError('updateMessage', args)
    }

    return result
  }

  private async postMessage(args: ChatPostMessageArguments, token: string): Promise<MessageResult> {
    this.logger.debug(args, 'Call webClient.chat.postMessage')
    const result: MessageResult = await this.webClient.chat.postMessage({
      ...args,
      token
    }) as any;

    if (!result.ok) {
      throw new ContextualError('postMessage', args)
    }

    return result;
  }

  async sendMessage(user: User, message: string): Promise<MessageResult> {
    const args: ChatPostMessageArguments = {text: message, channel: user.id}
    return await this.postMessage(args, user.workspace.accessToken);
  }
}
