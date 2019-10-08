import {IHttpAction} from "./index";
import { ReflectiveInjector, Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN} from "../../services/token";
import * as express from 'express'
import {SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import {
  InteractiveDialogSubmissionResponse,
  InteractiveResponse,
  InteractiveResponseTypeEnum
} from "../../slack/model/InteractiveResponse";
import {logError} from "../../services/logError";
import {IAppConfig} from "../../services/providers";
import {SlackTransport} from "../../slack/SlackTransport";

// TODO remove
@Injectable()
export class ApiSlackInteractive implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private slackTransport: SlackTransport
  ) {
  }

  async handle(req, res: express.Response) {
    const response = JSON.parse(req.body.payload) as any

    if (!response.type || !Object.values(InteractiveResponseTypeEnum).includes(response.type)) {
      logError(`Unknown interactive response type:  ${response.type}`)
      res.sendStatus(400);
      return res.send('', )
    }
    try {
      await this.handleResponse(response);
    } catch (e) {
      this.slackTransport.sendMessage(response.user, "Something happened wrong. We know about it already and gonna fix")
      res.sendStatus(500)
      throw e;
    }

    res.sendStatus(200)
  }

  async handleResponse(response: any) {
    if (response.type === InteractiveResponseTypeEnum.interactive_message) {
      await this.slackTransport.handleInteractiveResponse(response as InteractiveResponse)
    } else if (response.type === InteractiveResponseTypeEnum.dialog_submission) {
      await this.slackTransport.handleInteractiveDialogSubmissionResponse(response as InteractiveDialogSubmissionResponse)
    }
  }
}
