const slackClient = require('@slack/client')

const token = 'xoxb-212107961745-Z7GjveDgOttAGpUL9jMIvXlV'
const rtm = new slackClient.RtmClient(token)
//const web = new slackClient.WebClient(token)
//web.chat.postMessage(gUser.id, "Hello!");

const questions = [
  'What I worked on yesterday?',
  'What I working on today?',
  'Is anything standing in your way?'
]

const startCron = () => {
  const CronJob = require('cron').CronJob
  const cronJob = new CronJob({
    cronTime: '* * * * *', // every minutes
    onTick: () => {
      const now = new Date()
      console.log('Start standup for ' + now)
      startDailyMeetUpByDate(now)
    },
    start: false
  })

  cronJob.start();
}


const getLastQuestion = (channel) => {

}

const ask = (channel, text) => {
  rtm.sendMessage(text, channel);
  // save log
}


const channels = [];
const users = [];
const getChannelsByDate = (date) => {
  const channels = [users[0].channel]

  return channels;
}

const startDailyMeetUpByDate = (date) => {
  const channels = getChannelsByDate(date)
  channels.forEach((channel) => {
    startAsk(channel)
  })
}

const startAsk = (channel) => {
  ask(channel, questions[0])
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

const haveChannel = (channel) => {
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
  const text = message.text;
  if (text.charAt(0) === "\\") {
    const command = text.slice(1)
    const commandAnswer = getCommandAnswer(command)
    if (commandAnswer) {
      rtm.sendMessage(commandAnswer, message.channel);
    } else {
      rtm.sendMessage("Command "+command+" is not found. Type '\\help'", message.channel);
    }
  } else {
    rtm.sendMessage("Hello!", message.channel);
  }
}

rtm.on(slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(rtmStartData)

rtmStartData.users.forEach((user) => {
  if (user.name == 'sashaaro')
  {
    console.log(user)
    users.push(user)
  }
})

})

rtm.on(slackClient.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
  console.log('connection opened')
  console.log('Cron starting')
  startCron();
})

rtm.on(slackClient.RTM_EVENTS.MESSAGE, function (message) {

  console.log(message)
  if (!haveChannel(message.channel)){
    // TODO log
    //return
  }

  answer(message)
})

rtm.start()