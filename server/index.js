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

const token = 'xoxb-212107961745-Z7GjveDgOttAGpUL9jMIvXlV'
const mongoUrl = 'mongodb://localhost:27017/standup-slack-bot'

const SlackStandupBotClient = require('./SlackStandupBotClient')
MongoClient.connect(mongoUrl).then( async (db) => {
    console.log('Connected successfully to server')
    const botClient = new SlackStandupBotClient(new slackClient.RtmClient(token), db)
    await botClient.init()
    botClient.start()
    //botClient.stop()
}).catch(() => {

})


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
  res.send(pug.compileFile('templates/index.pug')({}))
})

app.get('/dashboard', async (req, res) => {
  const session = req.session
  if (!session.user) {
    res.send('Access deny')
    return;
  }
  const user = session.user;

  res.send(`Team ${user.team_name} dashboard`)
})

app.listen(3000);