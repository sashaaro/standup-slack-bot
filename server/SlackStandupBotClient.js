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
    this.questionsCollection = this.mongodb.collection('questions')
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

    this.rtm.on(slackClient.RTM_EVENTS.ERROR, async (message) => {
      console.log(message)
      this.stopInterval()
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

  async findReportChannelsByStartDate (date) {
    // teams filter by date.. team.users
    /*const users = await this.usersCollection.find().toArray()
    const userIDs = users.map((user) => (user.id));
    const ims = await this.imsCollection.find({user: {$in: userIDs}}).toArray()
    console.log(userIDs)
    console.log(ims)

    return ims.map((im) => (im.id));*/

    const teams = await this.teamsCollection.find().toArray()

    const reportedTeams = []

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
        reportedTeams.push(settings)
      }
    }

    return reportedTeams;
  }

  async findUserChannelsByStartDate (date) {
    // TODO filter date
    // teams filter by date.. team.users
    const users = await this.usersCollection.find().toArray()
    const userIDs = users.map((user) => (user.id))
    const ims = await this.imsCollection.find({user: {$in: userIDs}}).toArray()

    return ims.map((im) => (im.id))
  }
  
  async answer (message) {
    const meetUpInProcess = true // TODO
    if (meetUpInProcess) {
      const question = await this.questionsCollection.findOne({
        user_channel: message.channel,
        answer: {$exists: false}
      }); // find Not Reply Question
      if (question) {
        await this.questionsCollection.updateOne({_id: question._id}, {$set: {
          'answer': message.text
        }})
        if (!await this.askQuestion(message.channel, question.index + 1)) {
          this.send(message.channel, standUpGoodBye)
          return;
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
    // todo every 5 minutes
    this.everyMinutesIntervalID = setInterval(this.standUpForNow.bind(this), 60 * 1000) // every minutes
  }

  async startDailyMeetUpByDate (date) {
    // start ask users
    const userChannels = await this.findUserChannelsByStartDate(date)
    userChannels.forEach((userChannel) => {
      this.startAsk(userChannel)
    })

    // send report for end of meetup
    const reportedTeams = await this.findReportChannelsByStartDate(date);
    for(const reportedTeam of reportedTeams) {
      const reportText = 'Report ...';
      this.send(reportedTeam.settings.report_channel, reportText);
    }
  }

  startAsk (channel) {
    this.send(channel, standUpGreeting)
    //setTimeout(() => {
    this.askQuestion(channel, 0)
    //}, 1500)
  }

  async askQuestion(channel, questionIndex) {
    console.log(questionIndex)
    if (!questions[questionIndex]) {
      return false;
    }
    this.send(channel, questions[questionIndex])
    await this.questionsCollection.insertOne({
      user_channel: channel,
      index: questionIndex
    })

    return true
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

  existChannel (channel) {
    //return channels.contains(channel)
    return true
  }

  stopInterval() {
    clearInterval(this.everyMinutesIntervalID);
    this.everyMinutesIntervalID = null
  }

  stop () {
    this.stopInterval()
    this.rtm.close()
    //this.mongodb.close()
  }
}

module.exports = SlackStandupBotClient