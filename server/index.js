const mongodb = require('mongodb')
const slackClient = require('@slack/client')
const express = require('express')
const session = require('express-session')
const request = require('request-promise')
const pug = require('pug');
const bodyParser = require("body-parser");

const MongoClient = mongodb.MongoClient

const slackClientID = '220827250899.220366847441';
const slackSecret = 'd202438e1265994c4b85be301983e6b5';
const slackVerificationToken = 'Eeo49Ou9MDuvXEdFmnEZrRFB';
const botUserOAuthAccessToken = 'xoxb-220247998736-pWLHKrunnk9vfiZQAiHtz14f';

//const token = slackVerificationToken
const token = botUserOAuthAccessToken
const mongoUrl = 'mongodb://localhost:27017/standup-slack-bot'

const SlackStandupBotClient = require('./SlackStandupBotClient')

const authLink = 'https://slack.com/oauth/authorize?&client_id='+slackClientID+'&scope=bot,channels:read,team:read'

let db

const host = 'http://localhost:3000'
const app = express()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//app.use(express.static('public'));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  //cookie: { secure: true }
}));

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
    //console.log(response)
    const data = JSON.parse(response);
    if (data.ok) {
      //console.log(data);

      const session = req.session
      session.user = {
        access_token: data.access_token,
        scope: data.scope,
        user_id: data.user_id,
        team_name: data.team_name,
        team_id: data.team_id,
        bot: data.bot,
      }
    }

    return res.redirect('/dashboard')
  }
  res.send(pug.compileFile('templates/index.pug')({
      authLink: authLink
  }))
})

app.get('/dashboard', async (req, res) => {
  const session = req.session
  if (!session.user) {
    res.send('Access deny')
    return;
  }
  const user = session.user;

  res.send(pug.compileFile('templates/dashboard/index.pug')({
    team: user.team_name,
    authLink: authLink,
  }))

  //res.send(`Team ${user.team_name} dashboard`)
})

const timezoneList = {
  '-12.0': '(GMT -12:00) Eniwetok, Kwajalein',
  '-11.0': '(GMT -11:00) Midway Island, Samoa',
  '-10.0': '(GMT -10:00) Hawaii',
  '-9.0': '(GMT -9:00) Alaska',
  '-8.0': '(GMT -8:00) Pacific Time (US &amp; Canada)',
  '-7.0': '(GMT -7:00) Mountain Time (US &amp; Canada)',
  '-6.0': '(GMT -6:00) Central Time (US &amp; Canada), Mexico City',
  '-5.0': '(GMT -5:00) Eastern Time (US &amp; Canada), Bogota, Lima',
  '-4.0': '(GMT -4:00) Atlantic Time (Canada), Caracas, La Paz',
  '-3.5': '(GMT -3:30) Newfoundland',
  '-3.0': '(GMT -3:00) Brazil, Buenos Aires, Georgetown',
  '-2.0': '(GMT -2:00) Mid-Atlantic',
  '-1.0': '(GMT -1:00 hour) Azores, Cape Verde Islands',
  '0.0': '(GMT) Western Europe Time, London, Lisbon, Casablanca',
  '1.0': '(GMT +1:00 hour) Brussels, Copenhagen, Madrid, Paris',
  '2.0': '(GMT +2:00) Kaliningrad, South Africa',
  '3.0': '(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg',
  '3.5': '(GMT +3:30) Tehran',
  '4.0': '(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi',
  '4.5': '(GMT +4:30) Kabul',
  '5.0': '(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent',
  '5.5': '(GMT +5:30) Bombay, Calcutta, Madras, New Delhi',
  '5.75': '(GMT +5:45) Kathmandu',
  '6.0': '(GMT +6:00) Almaty, Dhaka, Colombo',
  '7.0': '(GMT +7:00) Bangkok, Hanoi, Jakarta',
  '8.0': '(GMT +8:00) Beijing, Perth, Singapore, Hong Kong',
  '9.0': '(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk',
  '9.5': '(GMT +9:30) Adelaide, Darwin',
  '10.0': '(GMT +10:00) Eastern Australia, Guam, Vladivostok',
  '11.0': '(GMT +11:00) Magadan, Solomon Islands, New Caledonia',
  '12.0': '(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka',
};

const defaultSettings = {
  timezone: '0.0',
  start: '10:00',
  end: '10:30',
  report_channel: null
}

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
  const channels = response.channels

  let team = await db.collection('teams').findOne({id: user.team_id})
  let settings = defaultSettings
  if(!team) {
    // TODO
  }
  if (team && team.settings) {
    settings = team.settings
  }

  res.send(pug.compileFile('templates/dashboard/settings.pug')({
    team: user.team_name,
    authLink: authLink,
    channels,
    timezoneList,
    settings
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
  const channels = response.channels

  let settings = defaultSettings
  if (req.body) {
    // todo validate
    settings = req.body
    await db.collection('teams').updateOne({id: user.team_id}, {$set: {
      settings: settings
    }}, {upsert: true})
  }

  res.send(pug.compileFile('templates/dashboard/settings.pug')({
    team: user.team_name,
    authLink: authLink,
    channels,
    timezoneList,
    settings
  }))
})

let botClient;
MongoClient.connect(mongoUrl).then( async (mongoDB) => {
  console.log('Connected successfully to server')
  db = mongoDB;
  botClient = new SlackStandupBotClient(new slackClient.RtmClient(token), mongoDB)
  await botClient.init()
  try {
    botClient.start()
  } catch (error) {
    console.log('Slack connect error')
    console.log(error)
  }
  //
  app.listen(3000);
}).catch(() => {
  botClient.stop()
})
