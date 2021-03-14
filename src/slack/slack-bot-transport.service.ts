import {Inject, Injectable} from "injection-js";
import User from "../model/User";
import StandUp from "../model/StandUp";
import groupBy from "lodash.groupby";
import {ChatPostMessageArguments, WebClient} from '@slack/web-api'
import {LOGGER_TOKEN} from "../services/token";
import {Logger} from "winston";
import {Block, KnownBlock} from "@slack/types";

const standUpFinishedAlreadyMsg = `Standup #{id} has already ended\nI will remind you when your next stand up would came`; // TODO link to report

export const hasOptionQuestions = (team) => team.questions.filter(q => q.options.length > 0)

export const CALLBACK_STANDUP_SUBMIT = 'standup_submit'
export const ACTION_OPEN_DIALOG = 'open_dialog'
export const ACTION_OPEN_REPORT = 'open_report'

@Injectable()
export class SlackBotTransport {
  constructor(
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private webClient: WebClient
  ) {
  }

  async openReport(standUp: StandUp, triggerId: string) {
    if (false) {
      // check in progress
    }
    const view = {
      type: "modal",
      title: {
        "type": "plain_text",
        "text": `Report #${standUp.team.originTeam.name}`.substr(0, 24).trim(),
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
    this.logger.debug('Call webClient.views.open', {args: args})

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
        "text": `Standup #${standUp.team.originTeam.name}`.substr(0, 24).trim(),
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
      }

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
        const text = `*${question.text}*\n${(hasOptions ? answer?.option?.text : answer?.answerMessage) || '-'}`
        view.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text
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

    // TODO validate https://github.com/slackapi/slack-api-specs/blob/master/web-api/slack_web_openapi_v2.json ?!
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

  async sendGreetingMessage(user: User, standUp: StandUp) {
    const fallbackText =  `It's time to start your daily standup ${standUp.team.originTeam.name}`;

    const blocks: (KnownBlock | Block)[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hello, it's time to start your daily standup *${standUp.team.originTeam.name}*`,
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


    await this.postMessage({
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
        if (!answer) {
          this.logger.warn('Answer not found', {user: user.id, question: question.id});
          return
        }

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
    this.postMessage({
      channel: standUp.team.originTeam.reportChannel.id,
      text,
      blocks
    })
  }

  private async postMessage(args: ChatPostMessageArguments) {
    this.logger.debug('Call webClient.chat.postMessage', args)
    await this.webClient.chat.postMessage(args);
  }

  async sendMessage(user: User, message: string): Promise<any> {
    const args: ChatPostMessageArguments = {text: message, channel: user.id}
    await this.postMessage(args);
  }
}
