// real time messages client
const slackClient = require('@slack/client')

const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'
const questions = [
  'What I worked on yesterday?',
  'What I working on today?',
  'Is anything standing in your way?'
]

class SlackStandupBotClient {
  constructor (rtm, mongodb) {
    this.rtm = rtm
    this.mongodb = mongodb

    this.standupMeetingsCollection = this.mongodb.collection('standup-meetings')
    this.teamsCollection = this.mongodb.collection('teams')
    this.imsCollection = this.mongodb.collection('ims-channels')
    this.usersCollection = this.mongodb.collection('users')
    this.reportsCollection = this.mongodb.collection('reports')
    this.askCollection = this.mongodb.collection('ask')
    this.everyMinutesIntervalID = null
  }

  async init () {
    this.rtm.on(slackClient.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
      console.log('Connection opened')
      const now = new Date()
      const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds()
      const millisecondsDelay = 60 * 1000 - milliseconds

      console.log('Wait delay ' + millisecondsDelay + ' milliseconds for run loop')
      //setTimeout(() => {
        console.log('StandUp interval starting')
        this.startStandUpInterval()
      //}, millisecondsDelay)
    })

    this.rtm.on(slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, async (rtmStartData) => {
      const team = rtmStartData.team
      console.log('Authenticated ' + team.name);

      await this.teamsCollection.updateOne({id: team.id}, {$set: team}, {upsert: true})

      for(const im of rtmStartData.ims) {
        await this.imsCollection.updateOne({id: im.id}, {$set: im}, {upsert: true})
      }


      //const users = rtmStartData.users;
      const users = rtmStartData.users.filter((user) => (user.name === 'sashaaro'));
      for(const user of users) {
        await this.usersCollection.updateOne({id: user.id}, {$set: user}, {upsert: true})
      }
      //this.usersCollection.insertMany(users)
    })

    this.rtm.on(slackClient.RTM_EVENTS.MESSAGE, async (message) => {
      console.log(message)
      if (!this.existChannel(message.channel)) {
        // TODO log
        //return
      }

      await this.answer(message)
    })

    if (!await this.usersCollection.ensureIndex({ "id": 1 }, { unique: true })) {
      await this.usersCollection.createIndex({ "id": 1 }, { unique: true })
    }

    if (!await this.teamsCollection.ensureIndex({ "id": 1 }, { unique: true })) {
      await this.teamsCollection.createIndex({ "id": 1 }, { unique: true })
    }
    if (!await this.imsCollection.ensureIndex({ "id": 1 }, { unique: true })) {
      await this.imsCollection.createIndex({ "id": 1 }, { unique: true })
    }
  }

  start() {
    this.rtm.start()
  }

  getCommandAnswer (command) {
    if (command === 'help') {
      return 'Help command'
    } else if (command === 'skip') {
      return 'Skip command'
    }

    return null
  }

  async getChannelsByStartDate (date) {
    // teams filter by date.. team.users
    /*const users = await this.usersCollection.find().toArray()
    const userIDs = users.map((user) => (user.id));
    const ims = await this.imsCollection.find({user: {$in: userIDs}}).toArray()
    console.log(userIDs)
    console.log(ims)

    return ims.map((im) => (im.id));*/

    const teams = await this.teamsCollection.find().toArray()

    const channels = []

    for(const team of teams) {
      const settings = team.settings
      if (!settings) {
        continue;
      }

      const minutes = date.getMinutes()
      const hours = date.getUTCHours()
      const timezone = parseFloat(settings.timezone)
      //const isSame = settings.start === ((hours + timezone) + ':' + minutes)
      const isSame = true

      if (isSame) {
        // TODO ims send to all users.
        channels.push(settings.report_channel)
      }
    }

    return channels;
  }

  async getNotReplyQuestion (channel) {
      const ask = await this.askCollection.findOne({user_channel: channel})// sort
      if (questions[ask.questionIndex])
        return questions[ask.questionIndex]
  }

  async getNextQuestion (channel) {
    const ask = await this.askCollection.findOne({user_channel: channel})// sort
    ++ask.questionIndex
    if (questions[ask.questionIndex])
        return questions[ask.questionIndex]
  }

  async resolveAnswer (message) {
    const meetUpInProcess = true
    if (meetUpInProcess) {
      const question = this.getNotReplyQuestion(message.channel)
      if (question) {
        const report = await this.reportsCollection.insertOne(message)
        // save answer message.text for question
        const nextQuestion = this.getNextQuestion(message.channel)
        if (nextQuestion) {
          return nextQuestion
        } else {
          return standUpGoodBye
        }
      } else {
        // TODO
        return 'wtf'
      }
    } else {
      // TODO
      return 'wtf!'
    }
  }

  standUpForNow () {
    const now = new Date()
    console.log('Start standup for ' + now)
    this.startDailyMeetUpByDate(now)
  }

  startStandUpInterval () {
    this.standUpForNow()
    this.everyMinutesIntervalID = setInterval(this.standUpForNow.bind(this), 60 * 1000) // every minutes
  }

  async startDailyMeetUpByDate (date) {
    const channels = await this.getChannelsByStartDate(date)
    channels.forEach((channel) => {
      this.startAsk(channel)
    })
  }

  startAsk (channel) {
    this.send(channel, standUpGreeting)
    //setTimeout(() => {
    this.askQuestion(channel, 0)
    //}, 1500)
  }

  askQuestion(channel, questionIndex) {
    if (!questions[questionIndex]) {
      throw new Error(`Question index ${questionIndex} does't exist`);
    }
    this.send(channel, questions[questionIndex])
    this.askCollection.insertOne({
      user_channel: channel,
      questionIndex: questionIndex
    })
  }

  send (channel, text) {
    const isDev = false;
    if (isDev) {
      console.log(text);
    } else {
      this.rtm.sendMessage(text, channel)
    }
    // save log
  }

  async answer (message) {
    // todo save message
    const text = message.text
    if (text.charAt(0) === '/') {
      const command = text.slice(1)
      const commandAnswer = this.getCommandAnswer(command)
      if (commandAnswer) {
        this.send(commandAnswer, message.channel)
      } else {
        this.send('Command ' + command + ' is not found. Type \'/help\'', message.channel)
      }
    } else {
      const answer = await this.resolveAnswer(message)
      this.send(answer, message.channel)
    }
  }

  existChannel (channel) {
    //return channels.contains(channel)
    return true
  }

  stop () {
    clearInterval(this.everyMinutesIntervalID);
    this.everyMinutesIntervalID = null

    this.rtm.close()
    //this.mongodb.close()
  }
}

module.exports = SlackStandupBotClient