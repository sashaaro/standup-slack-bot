import "reflect-metadata";
import {createConnection, Connection} from "typeorm";
import Question from "./model/Question";
import Team, {TeamSettings} from "./model/Team";
import User from "./model/User";

//const slackClient = require('@slack/client')
import * as slackClient from '@slack/client'
import * as express from 'express'
import * as session from 'express-session'
//import * as connectMongo from 'connect-mongo'
import * as request from 'request-promise'
import * as pug from 'pug'
import * as bodyParser from 'body-parser'
import parameters from './parameters'
import SlackStandupBotClient from './SlackStandupBotClientService'
import Im from "./model/Im";
import {SlackChannel} from "./slack/model/SlackChannel";
import { createEventAdapter } from '@slack/events-api';
import {timezone} from "./dictionary/timezone";

//const MongoStore = connectMongo(session)

const slackClientID = parameters.slackClientID;
const slackSecret = parameters.slackSecret;
const slackVerificationToken = parameters.slackVerificationToken;
const botUserOAuthAccessToken = parameters.botUserOAuthAccessToken;
const token = botUserOAuthAccessToken

const host = parameters.host
const authLink = 'https://slack.com/oauth/authorize?&client_id='+slackClientID+'&scope=bot,channels:read,team:read'

let connection: Connection;

const app = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: 'keyboard cat',
    //resave: false,
    //saveUninitialized: true,
    //cookie: { secure: true }
}))

app.get('/', async (req, res) => {
    if (req.query.code){
        const options = {
            uri: 'https://slack.com/api/oauth.access?code='
            +req.query.code+
            '&client_id='+slackClientID+
            '&client_secret='+slackSecret+
            '&redirect_uri='+host,
            method: 'GET'
        }

        const response = await request(options)
        const data = JSON.parse(response);
        if (data.ok) {
            const session = req.session
            session.user = {
                access_token: data.access_token,
                scope: data.scope,
                user_id: data.user_id,
                team_name: data.team_name,
                team_id: data.team_id,
                bot: data.bot,
            }
        } else {
            throw new Error(data)
        }

        return res.redirect('/dashboard')
    }
    res.send(pug.compileFile('templates/index.pug')({
        authLink: authLink
    }))
})

const questionList = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
]

app.get('/dashboard', async (req, res) => {
    const session = req.session
    if (!session.user) {
        res.send('Access deny')
        return;
    }
    const user = session.user;


    let users = await connection.getRepository(User).find({team: user.team_id})

    for(const user of users) {
        user.questions = await connection.getRepository(Question).find();
    }

    res.send(pug.compileFile('templates/dashboard/index.pug')({
        team: user.team_name,
        authLink: authLink,
        questionList: [],
        users,
        activeMenu: 'reports'
    }))
})

const timezoneList = timezone

app.route('/dashboard/settings').get(async (req, res) => {
    const session = req.session
    if (!session.user) {
        res.send('Access deny') // TODO 403
        return;
    }
    const user = session.user;

    /*const response = await request({
      url: 'https://slack.com/api/chat.postMessage',
      method: 'POST',
      form: {
        token: user.access_token,
        channel: user.user_id,
        text: 'Hello'
      }
    })*/

    //const botClient = new SlackStandupBotClient(new slackClient.RtmClient(user.bot.bot_access_token), db)
    //botClient.init();
    //botClient.start();

    const webClient = new slackClient.WebClient(session.user.access_token)
    const response = await webClient.channels.list();
    if (!response.ok) {
        throw new Error();
    }
    const channels = (response as any).channels as SlackChannel[]

    let team = await connection.getRepository(Team).findOne({id: user.team_id})

    if(!team) {
        // TODO
        throw new Error('team is not found');
    }

    res.send(pug.compileFile('templates/dashboard/settings.pug')({
        team: user.team_name,
        authLink: authLink,
        channels,
        timezoneList,
        settings: team.settings,
        activeMenu: 'settings'
    }))
}).post(async (req, res) => {
    const session = req.session
    if (!session.user) {
        res.send('Access deny') // TODO 403
        return;
    }
    const user = session.user;

    const webClient = new slackClient.WebClient(session.user.access_token)
    const response = await webClient.channels.list();
    if (!response.ok) {
        throw new Error();
    }
    const channels = (response as any).channels

    const teamRepository = connection.getRepository(Team);
    let team = await teamRepository.findOne({id: user.team_id})

    if(!team) {
        // TODO
        throw new Error('team is not found');
    }

    if (req.body) {
        // todo validate
        team.settings = <TeamSettings>req.body
        await teamRepository.save(team)
    }

    res.send(pug.compileFile('templates/dashboard/settings.pug')({
        team: user.team_name,
        authLink: authLink,
        channels,
        timezoneList,
        settings: team.settings,
        activeMenu: 'settings'
    }))
})

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
    connection = await createConnection({
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
        new slackClient.RTMClient(token),
        new slackClient.WebClient(token),
        connection)
    await botClient.init()
    botClient.start()

    app.listen(3000);
    // here you can start to work with your entities
}).catch(error => console.log(error));