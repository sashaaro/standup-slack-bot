import {IHttpAction} from "./index";
import {Inject, Service} from "typedi";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";

@Service()
export class ApiSlackInteractive implements IHttpAction {
  constructor(@Inject(CONFIG_TOKEN) private config: IAppConfig) {
  }

  async handle(req, res) {
    console.log(req)
    console.log(req.body)

    return res.send('')
  }
}
