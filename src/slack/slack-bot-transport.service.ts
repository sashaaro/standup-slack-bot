import {Inject, Injectable} from "injection-js";
import {Standup, User, UserStandup} from "../entity";
import {
  ChatPostMessageArguments,
  ChatUpdateArguments,
  WebClient
} from '@slack/web-api'
import {Logger} from "pino";
import {ContextualError, HasPreviousError, isPlatformError, sortByIndex} from "../services/utils";
import {MessageResult} from "./model/MessageResult";
import {OpenViewResult} from "./model/OpenViewResult";
import {generateStandupMsg} from "./slack-blocks";
import {LOG_TOKEN} from "../services/token";

export const hasOptionQuestions = (team) => team.questions.filter(q => q.options.length > 0)

export const CALLBACK_STANDUP_SUBMIT = 'standup_submit'
export const ACTION_OPEN_DIALOG = 'open_dialog'


class SlackMethodError extends HasPreviousError {
  constructor(
      message?: string,
      public result?: any|OpenViewResult|MessageResult, // TODO remove see slack client logs by requestId?!
      public args?: ChatPostMessageArguments
  ) {
    super(message);
  }
}

@Injectable()
export class SlackBotTransport {
  constructor(
    @Inject(LOG_TOKEN) private logger: Logger,
    private webClient: WebClient
  ) {
  }

  async openDialog(userStandup: UserStandup, triggerId: string): Promise<OpenViewResult['view']> {
    const isFinished = userStandup.standup.isFinished();

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

    if (!isFinished) {
      view.submit = {
        "type": "plain_text",
          "text": userStandup.answers.length > 0 ? "Update" : "Submit",
          "emoji": true
      }
    }

    const standup = userStandup.standup

    for (const question of [...standup.team.questions.getItems()].sort(sortByIndex)) {
      const answer = userStandup.answers.getItems().find(answer => answer.question.id === question.id);

      const hasOptions = question.options.length > 1;
      const element: any = {
        type: hasOptions ?  "static_select" : "plain_text_input",
        action_id: question.id.toString(),
      }

      if (!isFinished) {
        if (hasOptions) {
          element.placeholder = {
            "type": "plain_text",
            "text": "Select an item",
            "emoji": true
          }

          element.options = [...question.options.getItems()].sort(sortByIndex).map(pa => ({
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
              this.logger.warn(element, 'Selected option is not found')
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

      const isLast = question === standup.team.questions[standup.team.questions.length - 1]
      if (!isLast) {
        view.blocks.push({
          type: "divider"
        })
      }
    }

    // TODO validate https://github.com/slackapi/slack-api-specs/blob/master/web-api/slack_web_openapi_v2.json ?!
    const args: any = {
      view: view,
      trigger_id: triggerId,
      token: standup.team.originTeam.workspace.accessToken
    }
    this.logger.trace(args, 'Call webClient.views.open')
    const result: OpenViewResult|any = await this.webClient.views.open(args)

    if (!result.ok) {
      throw new SlackMethodError('openDialog', result, args)
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

    const args = {
      channel: user.id,
      ...generateStandupMsg(standup),
    } as ChatPostMessageArguments

    const result = await this.postMessage(args, standup.team.originTeam.workspace.accessToken);

    if (!result.ok) {
      throw new SlackMethodError('Send report post message error', result, args)
    }

    return result;
  }

  async sendReport(standup: Standup): Promise<MessageResult['message']> {
    const answersBlocks = []
    for (const userStandup of standup.users.getItems()) {
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
            "image_url": user.profile.image_72,
            "alt_text": "alt text for image"
          }} : {})
      })

      const isLast = standup.users.getItems().indexOf(userStandup) === standup.users.length - 1

      if (!isLast) {
        answersBlocks.push({
          type: "divider"
        })
      }
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
    let result: MessageResult;

    const args = {
      channel: standup.team.originTeam.reportChannel.id, // TODO use from snapshot?!
      text,
      blocks,
    }
    try { // todo remove try catch?!
      result = await this.postMessage(args, standup.team.originTeam.workspace.accessToken)
    } catch (error) {if (isPlatformError(error) && error.data.error === 'not_in_channel') {
        // TODO notify
        this.logger.warn({
          channel: standup.team.originTeam.reportChannel.id,
          standup: standup.id,
        }, 'bot are not joined in report channel')
      } else { // data.error === 'invalid_blocks'
        const e = new SlackMethodError('Send report post message error', result, args)
        e.previous = error
        throw e;
      }
    }

    // TODO persist standup.reportMessage = result;

    if (!result.ok) {
      throw new SlackMethodError('Send report post message error', result, args)
    }

    this.logger.debug({result}, 'Report message')

    await Promise.all(standup.users.getItems().map((userStandup) => {
      // this.sendMessage(userStandup.user,
      //     `<https://${userStandup.standup.team.originTeam.workspace.domain}.slack.com/archives/${result.channel}/p${result.message.ts}|aaaa> sadfjlhd`
      // )

      // https://api.slack.com/docs/rate-limits ?!
      return this.updateMessage({
        token: userStandup.standup.team.originTeam.workspace.accessToken,
        ts: userStandup.slackMessage.ts,
        channel: userStandup.slackMessage.channel,
        ...generateStandupMsg(userStandup.standup, userStandup.answers.length > 0, `https://${userStandup.standup.team.originTeam.workspace.domain}.slack.com/archives/${result.channel}/p${result.message.ts}`),
      } as ChatUpdateArguments)
    }))

    return result.message;
  }

  public async updateMessage(args: ChatUpdateArguments): Promise<MessageResult> {
    this.logger.trace(args, 'Call webClient.chat.update')
    let result: MessageResult
    result = await this.webClient.chat.update({
      ...args
    }) as any;

    if (!result.ok) {
      throw new SlackMethodError('updateMessage', result)
    }

    return result
  }

  private async postMessage(args: ChatPostMessageArguments, token: string): Promise<MessageResult> {
    args = {
      ...args,
      token
    }
    this.logger.trace(args, 'Call webClient.chat.postMessage')
    const result = await this.webClient.chat.postMessage(args) as MessageResult;

    if (!result.ok) {
      throw new SlackMethodError('webClient.chat.postMessage', result, args)
    }

    return result;
  }

  async sendMessage(user: User, message: string): Promise<MessageResult> {
    const args: ChatPostMessageArguments = {text: message, channel: user.id}
    return await this.postMessage(args, user.workspace.accessToken);
  }
}
