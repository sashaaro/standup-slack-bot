import "reflect-metadata";
import {createConnection, Connection} from "typeorm";
import Question from "./model/Question";
import Team, {TeamSettings} from "./model/Team";
import User from "./model/User";
import { RTMClient, WebClient } from '@slack/client'
import parameters from './parameters'
import SlackStandupBotClient from './SlackStandupBotClientService'
import Im from "./model/Im";
import {createExpressApp} from "./http/createExpressApp";

const config = parameters as IAppConfig;

export interface IAppConfig {
    slackClientID: string,
    slackSecret: string,
    slackVerificationToken: string,
    botUserOAuthAccessToken: string,
    mongoUrl: string,
    host: string,
    defaultSettings: {
        timezone: string,
        start: string,
        end: string,
        report_channel?: string
    },
    debug: false
}

createConnection({
    type: "postgres",
    host: "postgres",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres"
}).then(async (conn: Connection) => {
    const isExist =
        ((await conn.query("SELECT datname FROM pg_database WHERE datname = 'standup' LIMIT 1")) as any[]).length === 1;
    if (!isExist) {
        await conn.query("CREATE DATABASE standup");
    }
    await conn.close()
    const connection = await createConnection({
        type: "postgres",
        //host: "localhost",
        host: "postgres",
        //host: "172.17.0.1",
        port: 5432,
        username: "postgres",
        password: "postgres",
        database: "standup",
        entities: [
            Question,
            Team,
            User,
            Im,
        ],
        synchronize: true,
    })

    const botClient = new SlackStandupBotClient(
        new RTMClient(config.botUserOAuthAccessToken),
        new WebClient(config.botUserOAuthAccessToken),
        connection)
    await botClient.init()
    botClient.start()

    const app = createExpressApp(connection, config)
    app.listen(3000);
    // here you can start to work with your entities
}).catch(error => console.log(error));