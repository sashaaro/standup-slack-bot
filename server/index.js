const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient

const mongoUrl = 'mongodb://localhost:27017/standup-slack-bot';


const createSlackStandupBotClient = require('./createSlackStandupBotClient')
MongoClient.connect(mongoUrl, (err, db) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected successfully to server");
        const botClient = createSlackStandupBotClient(db)
        botClient.close()
    }
});