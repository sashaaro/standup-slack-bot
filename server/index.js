const mongodb = require('mongodb')
const slackClient = require('@slack/client')
const express = require('express')
const session = require('express-session')
const request = require('request-promise')
const pug = require('pug');


const MongoClient = mongodb.MongoClient

const slackClientID = '220827250899.220366847441';
const slackSecret = 'd202438e1265994c4b85be301983e6b5';
const slackVerificationToken = 'Eeo49Ou9MDuvXEdFmnEZrRFB';

const token = slackVerificationToken
const mongoUrl = 'mongodb://localhost:27017/standup-slack-bot'

const SlackStandupBotClient = require('./SlackStandupBotClient')

const authLink = 'https://slack.com/oauth/authorize?&client_id=220827250899.220366847441&scope=bot,channels:read,team:read'

let db

const host = 'http://localhost:3000'
const app = express()
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
    console.log(data);
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

      console.log(session.user)
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

app.get('/dashboard/settings', async (req, res) => {
  const session = req.session
  if (!session.user) {
    res.send('Access deny')
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


  /*

   <option value="-12.0">(GMT -12:00) Eniwetok, Kwajalein</option>
   <option value="-11.0">(GMT -11:00) Midway Island, Samoa</option>
   <option value="-10.0">(GMT -10:00) Hawaii</option>
   <option value="-9.0">(GMT -9:00) Alaska</option>
   <option value="-8.0">(GMT -8:00) Pacific Time (US &amp; Canada)</option>
   <option value="-7.0">(GMT -7:00) Mountain Time (US &amp; Canada)</option>
   <option value="-6.0">(GMT -6:00) Central Time (US &amp; Canada), Mexico City</option>
   <option value="-5.0">(GMT -5:00) Eastern Time (US &amp; Canada), Bogota, Lima</option>
   <option value="-4.0">(GMT -4:00) Atlantic Time (Canada), Caracas, La Paz</option>
   <option value="-3.5">(GMT -3:30) Newfoundland</option>
   <option value="-3.0">(GMT -3:00) Brazil, Buenos Aires, Georgetown</option>
   <option value="-2.0">(GMT -2:00) Mid-Atlantic</option>
   <option value="-1.0">(GMT -1:00 hour) Azores, Cape Verde Islands</option>
   <option value="0.0">(GMT) Western Europe Time, London, Lisbon, Casablanca</option>
   <option value="1.0">(GMT +1:00 hour) Brussels, Copenhagen, Madrid, Paris</option>
   <option value="2.0">(GMT +2:00) Kaliningrad, South Africa</option>
   <option value="3.0">(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg</option>
   <option value="3.5">(GMT +3:30) Tehran</option>
   <option value="4.0">(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi</option>
   <option value="4.5">(GMT +4:30) Kabul</option>
   <option value="5.0">(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent</option>
   <option value="5.5">(GMT +5:30) Bombay, Calcutta, Madras, New Delhi</option>
   <option value="5.75">(GMT +5:45) Kathmandu</option>
   <option value="6.0">(GMT +6:00) Almaty, Dhaka, Colombo</option>
   <option value="7.0">(GMT +7:00) Bangkok, Hanoi, Jakarta</option>
   <option value="8.0">(GMT +8:00) Beijing, Perth, Singapore, Hong Kong</option>
   <option value="9.0">(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk</option>
   <option value="9.5">(GMT +9:30) Adelaide, Darwin</option>
   <option value="10.0">(GMT +10:00) Eastern Australia, Guam, Vladivostok</option>
   <option value="11.0">(GMT +11:00) Magadan, Solomon Islands, New Caledonia</option>
   <option value="12.0">(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka</option>
   */
  const timezoneList = [
   '(GMT -12:00) Eniwetok, Kwajalein',
  '(GMT -11:00) Midway Island, Samoa',
  '(GMT -10:00) Hawaii',
  '(GMT -9:00) Alaska',
  '(GMT -8:00) Pacific Time (US &amp; Canada)',
  '(GMT -7:00) Mountain Time (US &amp; Canada)',
  '(GMT -6:00) Central Time (US &amp; Canada), Mexico City',
  '(GMT -5:00) Eastern Time (US &amp; Canada), Bogota, Lima',
  '(GMT -4:00) Atlantic Time (Canada), Caracas, La Paz',
  '(GMT -3:30) Newfoundland',
  '(GMT -3:00) Brazil, Buenos Aires, Georgetown',
  '(GMT -2:00) Mid-Atlantic',
  '(GMT -1:00 hour) Azores, Cape Verde Islands',
  '(GMT) Western Europe Time, London, Lisbon, Casablanca',
  '(GMT +1:00 hour) Brussels, Copenhagen, Madrid, Paris',
  '(GMT +2:00) Kaliningrad, South Africa',
  '(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg',
  '(GMT +3:30) Tehran',
  '(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi',
  '(GMT +4:30) Kabul',
  '(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent',
  '(GMT +5:30) Bombay, Calcutta, Madras, New Delhi',
  '(GMT +5:45) Kathmandu',
  '(GMT +6:00) Almaty, Dhaka, Colombo',
  '(GMT +7:00) Bangkok, Hanoi, Jakarta',
  '(GMT +8:00) Beijing, Perth, Singapore, Hong Kong',
  '(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk',
  '(GMT +9:30) Adelaide, Darwin',
  '(GMT +10:00) Eastern Australia, Guam, Vladivostok',
  '(GMT +11:00) Magadan, Solomon Islands, New Caledonia',
  '(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka',
  ];


    res.send(pug.compileFile('templates/dashboard/settings.pug')({
        team: user.team_name,
        authLink: authLink,
        channels,
        timezoneList
    }))

    //res.send(`Team ${user.team_name} dashboard`)
})


MongoClient.connect(mongoUrl).then( async (mongoDB) => {
  console.log('Connected successfully to server')
  db = mongoDB;
  //const botClient = new SlackStandupBotClient(new slackClient.RtmClient(token), mongoDB)
  //await botClient.init()
  //botClient.start()
  //botClient.stop()
  app.listen(3000);
}).catch(() => {

})
