import "reflect-metadata";
import {createConnection, Connection} from "typeorm";
import Question from "./model/Question";
import Team from "./model/Team";
import User from "./model/User";
import {RTMClient, WebClient} from '@slack/client'
import parameters from './parameters'
import StandUpBotService, {
  ITimezone, ITimezoneProvider,
  STAND_UP_BOT_STAND_UP_PROVIDER,
  STAND_UP_BOT_TEAM_PROVIDER, STAND_UP_BOT_TRANSPORT
} from './StandUpBotService'
import {createExpressApp} from "./http/createExpressApp";
import Answer from "./model/Answer";
import StandUp from "./model/StandUp";
import {Container, Token} from "typedi";
import {timezone} from "./dictionary/timezone";
import {SlackProvider} from "./slack/SlackProvider";
import {CONFIG_TOKEN} from "./services/token";
import {Channel} from "./model/Channel";

const config = parameters as IAppConfig;


export interface IAppConfig {
  slackClientID: string,
  slackSecret: string,
  slackVerificationToken: string,
  botUserOAuthAccessToken: string,
  host: string,
  defaultSettings: {
    timezone: string,
    start: string,
    end: string,
  },
  debug: false
}


// move
const getPgTimezoneList = (connection: Connection): ITimezoneProvider => (
  (() => (connection.query('select * from pg_timezone_names LIMIT 10') as Promise<ITimezone[]>)) as ITimezoneProvider
)
const getTimezoneList: ITimezoneProvider = () => (new Promise(resolve => {
  const list: ITimezone[] = []
  for (const time in timezone) {
    const value = timezone[time]

    list.push({name: value, abbrev: time, utc_offset: {hours: parseFloat(time)}} as ITimezone)
  }

  resolve(list);
}))


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
      Answer,
      StandUp,
      Channel
    ],
    synchronize: true,
    //logging: true
  })

  const questions = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
  ]

  if (!await connection.getRepository(Question).count()) {
    let index = 0
    for (const q of questions) {
      const qu = new Question()
      qu.text = q
      qu.index = index
      qu.disabled = false
      await connection.getRepository(Question).insert(qu)
      ++index;
    }
  }

  const rtmClient = new RTMClient(config.botUserOAuthAccessToken)
  const webClient = new WebClient(config.botUserOAuthAccessToken)

  Container.set(RTMClient, rtmClient);
  Container.set(WebClient, webClient);
  Container.set(Connection, connection);
  Container.set(CONFIG_TOKEN, config);
  Container.set('timezoneList', getTimezoneList());


  const slackProvider = Container.get(SlackProvider)

  Container.set(STAND_UP_BOT_TEAM_PROVIDER, slackProvider);
  Container.set(STAND_UP_BOT_STAND_UP_PROVIDER, slackProvider);
  Container.set(STAND_UP_BOT_TRANSPORT, slackProvider);

  await slackProvider.init();
  const botClient = Container.get(StandUpBotService)
  botClient.start()

  const app = createExpressApp()
  app.listen(3000);
  // here you can start to work with your entities
}).catch(error => console.log(error));
