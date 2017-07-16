const slackClient = require('@slack/client')

const token = 'xoxb-212107961745-Z7GjveDgOttAGpUL9jMIvXlV'
const rtm = new slackClient.RtmClient(token)

const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'
const questions = [
  'What I worked on yesterday?',
  'What I working on today?',
  'Is anything standing in your way?'
]

const startStandUpInteraval = () => {
  const onTick = () => {
    const now = new Date()
    console.log('Start standup for ' + now)
    startDailyMeetUpByDate(now)
  }

  const intervalID = setInterval(onTick, 60 * 1000) // every minutes
}


const send = (channel, text) => {
  rtm.sendMessage(text, channel);
  // save log
}


const channels = [];
let users = [];
let ims = [];

const getChannelsByDate = (date) => {
  const channels = []

  // teams filter by date.. team.users

  users.forEach((user) => {
    const filtered = ims.filter((im) => (user.id === im.user))
    if (filtered) {
      channels.push(filtered[0].id)
    } else {
      // TODO log
    }
  })

  return channels;
}

const report = [];


const getNotReplyQuestion = (channel) => {
  return questions[report.length]
}

const getNextQuestion = (channel) => {
  return questions[report.length]
}

const resolveAnswer = (message) => {
  const meetUpInProcess = true
  if (meetUpInProcess) {
    const question = getNotReplyQuestion(message.channel)
    if (question) {
      report.push(message.text)
      // save answer message.text for question
      const nextQuestion = getNextQuestion(message.channel)
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

const startDailyMeetUpByDate = (date) => {
  const channels = getChannelsByDate(date)
  channels.forEach((channel) => {
    startAsk(channel)
  })
}

const startAsk = (channel) => {
  send(channel, standUpGreeting)
  //setTimeout(() => {
    send(channel, questions[0])
  //}, 1500)
}

const getCurrentQuestion = (channel) => {

}

const nextAsk = (channel) => {
  const currentQuestion = getCurrentQuestion(channel)
  if (currentQuestion) {

  }
}

const startDailyMeetup = (channels) => {
  channels.forEach((channel) => {
    nextAsk(channel)
  });
}

const existChannel = (channel) => {
  //return channels.contains(channel)
  return true;
}

const getCommandAnswer = (command) => {
  if (command === 'help') {
    return "Help command"
  } else if (command === 'skip') {
    return "Skip command"
  }

  return null;
}

const answer = (message) => {
  // todo save message

  const text = message.text;
  if (text.charAt(0) === "/") {
    const command = text.slice(1)
    const commandAnswer = getCommandAnswer(command)
    if (commandAnswer) {
      rtm.sendMessage(commandAnswer, message.channel);
    } else {
      rtm.sendMessage("Command "+command+" is not found. Type '/help'", message.channel);
    }
  } else {
    const answer = resolveAnswer(message)
    rtm.sendMessage(answer, message.channel);
  }
}

const teams = []

rtm.on(slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  teams.push(rtmStartData.team)
  ims = rtmStartData.ims
  users = rtmStartData.users.filter((user) => (user.name === 'sashaaro'))
})

rtm.on(slackClient.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
  console.log('Connection opened')
  console.log('StandUp interval starting')
  startStandUpInteraval();
})

rtm.on(slackClient.RTM_EVENTS.MESSAGE, function (message) {

  console.log(message)
  if (!existChannel(message.channel)){
    // TODO log
    //return
  }

  answer(message)
})

rtm.start()