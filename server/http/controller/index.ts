import {Connection} from "typeorm";
import {IAppConfig} from "../../index_ts";

const noImplementation = () => {
    throw Error("No implementation")
}

export class HttpController {
    constructor(protected connection: Connection, protected config: IAppConfig) {
    }

    mainAction(req, res) {noImplementation()};
    dashboardAction(req, res) {noImplementation()};
    settingsAction(req, res) {noImplementation()};
    postSettingsAction(req, res) {noImplementation()};
}