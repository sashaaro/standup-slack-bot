import {Connection} from "typeorm";
import {IAppConfig} from "../../index_ts";

const noImplementation = () => {
  throw Error("No implementation")
}

export const templateDirPath = './resources/templates'

export class HttpController {
  constructor(protected connection: Connection, protected config: IAppConfig) {
  }

  authAction(req, res) {
    noImplementation()
  };

  standUpsAction(req, res) {
    noImplementation()
  };

  settingsAction(req, res) {
    noImplementation()
  };

  postSettingsAction(req, res) {
    noImplementation()
  };
}
