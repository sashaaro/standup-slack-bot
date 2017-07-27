const mongodb = require('mongodb')
const slackClient = require('@slack/client')

const MongoClient = mongodb.MongoClient

const token = 'xoxb-212107961745-Z7GjveDgOttAGpUL9jMIvXlV'
const mongoUrl = 'mongodb://localhost:27017/standup-slack-bot'

const SlackStandupBotClient = require('./SlackStandupBotClient')
MongoClient.connect(mongoUrl).then( async (db) => {
    console.log('Connected successfully to server')
    const botClient = new SlackStandupBotClient(new slackClient.RtmClient(token), db)
    await botClient.init()
    botClient.start()
    //botClient.stop()
})