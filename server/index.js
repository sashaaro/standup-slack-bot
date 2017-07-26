const mongodb = require('mongodb')
const slackClient = require('@slack/client')

const MongoClient = mongodb.MongoClient

const token = 'xoxb-212107961745-Z7GjveDgOttAGpUL9jMIvXlV'
const mongoUrl = 'mongodb://localhost:27017/standup-slack-bot'

const SlackStandupBotClient = require('./SlackStandupBotClient')
MongoClient.connect(mongoUrl, (err, db) => {
  if (err) {
    console.log(err)
  } else {
    console.log('Connected successfully to server')
    const botClient = new SlackStandupBotClient(new slackClient.RtmClient(token), db)
    botClient.init()
    botClient.start()
    //botClient.close()
  }
})