import {IHttpAction} from "./index";
import {Inject, Service} from "typedi";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import {SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import {InteractiveResponse} from "../../slack/model/InteractiveResponse";



@Service()
export class ApiSlackInteractive implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private slackStandUpProvider: SlackStandUpProvider
  ) {
  }

  async handle(req, res) {
    const response = JSON.parse(req.body.payload) as InteractiveResponse

    console.log(response);

    if (response.type !== "interactive_message") {
      console.log(`Unknown interactive response type:  ${response.type}`)
      res.sendStatus(400);
      return res.send('', )
    }

    await this.slackStandUpProvider.handleInteractiveResponse(response)

    return res.send('')
  }
}
