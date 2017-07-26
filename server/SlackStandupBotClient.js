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
  }

  init () {
    this.rtm.on(slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
      this.teamsCollection.insertOne(rtmStartData.team, (err, db) => {

      })
      this.imsCollection.insertOne(rtmStartData.ims, (err, db) => {

      })
      this.usersCollection.insertOne({list: rtmStartData.users}, (err, db) => {

      })
      this.usersCollection.insertMany(rtmStartData.users.filter((user) => (user.name === 'sashaaro')))
    })

    this.rtm.on(slackClient.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
      console.log('Connection opened')
      const now = new Date()
      const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds()
      const millisecondsDelay = 60 * 1000 - milliseconds

      console.log('Wait delay ' + millisecondsDelay + ' milliseconds for run loop')
      setTimeout(() => {
        console.log('StandUp interval starting')
        this.startStandUpInterval()
      }, millisecondsDelay)
    })

    this.rtm.on(slackClient.RTM_EVENTS.MESSAGE, (message) => {

      console.log(message)
      if (!this.existChannel(message.channel)) {
        // TODO log
        //return
      }

      this.answer(message)
    })
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

  getChannelsByDate (date) {
    const channels = []

    // teams filter by date.. team.users

    this.usersCollection.find().forEach((user) => {
      const filtered = this.imsCollection.filter((im) => (user.id === im.user))
      if (filtered) {
        channels.push(filtered[0].id)
      } else {
        // TODO log
      }
    })

    return channels
  }

  getNotReplyQuestion (channel) {
    return questions[report.length]
  }

  getNextQuestion (channel) {
    return questions[report.length]
  }

  resolveAnswer (message) {
    const meetUpInProcess = true
    if (meetUpInProcess) {
      const question = this.getNotReplyQuestion(message.channel)
      if (question) {
        report.push(message.text)
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
    const intervalID = setInterval(this.standUpForNow.bind(this), 60 * 1000) // every minutes

    return intervalID
  }

  startDailyMeetUpByDate (date) {
    const channels = this.getChannelsByDate(date)
    channels.forEach((channel) => {
      this.startAsk(channel)
    })
  }

  startAsk (channel) {
    this.send(channel, standUpGreeting)
    //setTimeout(() => {
    this.send(channel, questions[0])
    //}, 1500)
  }

  getCurrentQuestion (channel) {

  }

  nextAsk (channel) {
    const currentQuestion = this.getCurrentQuestion(channel)
    if (currentQuestion) {

    }
  }

  startDailyMeetup (channels) {
    channels.forEach((channel) => {
      this.nextAsk(channel)
    })
  }

  answer (message) {
    // todo save message
    const text = message.text
    if (text.charAt(0) === '/') {
      const command = text.slice(1)
      const commandAnswer = this.getCommandAnswer(command)
      if (commandAnswer) {
        this.rtm.sendMessage(commandAnswer, message.channel)
      } else {
        this.rtm.sendMessage('Command ' + command + ' is not found. Type \'/help\'', message.channel)
      }
    } else {
      const answer = this.resolveAnswer(message)
      this.rtm.sendMessage(answer, message.channel)
    }
  }

  send (channel, text) {
    this.rtm.sendMessage(text, channel)
    // save log
  }

  existChannel (channel) {
    //return channels.contains(channel)
    return true
  }

  close () {
    this.rtm.close()

    this.mongodb.close()
  }
}

module.exports = SlackStandupBotClient