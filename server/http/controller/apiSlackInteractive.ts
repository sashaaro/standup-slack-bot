import {IHttpAction} from "./index";
import {Inject, Service} from "typedi";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import {SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import {
  InteractiveDialogSubmissionResponse,
  InteractiveResponse,
  InteractiveResponseTypeEnum
} from "../../slack/model/InteractiveResponse";



@Service()
export class ApiSlackInteractive implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private slackStandUpProvider: SlackStandUpProvider
  ) {
  }

  async handle(req, res) {
    const response = JSON.parse(req.body.payload) as any

    if (!response.type || !Object.values(InteractiveResponseTypeEnum).includes(response.type)) {
      console.log(`Unknown interactive response type:  ${response.type}`)
      res.sendStatus(400);
      return res.send('', )
    }

    if (response.type === InteractiveResponseTypeEnum.interactive_message) {
      await this.slackStandUpProvider.handleInteractiveResponse(response as InteractiveResponse)
    } else if (response.type === InteractiveResponseTypeEnum.dialog_submission) {
      await this.slackStandUpProvider.handleInteractiveDialogSubmissionResponse(response as InteractiveDialogSubmissionResponse)
    }

    return res.send('')
  }
}
