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
    cronTime: '* * * * *',
    onTick: function () { // every minutes
      const now = new DateTime()
      startDailyMeetUpByDateTime(now)
      console.log('You will see this message every second')
    },
    start: false
  })

  cronJob.start();
}


const getLastQuestion = (channel) => {

}

const ask = (channel) => {
  const lastQuestion = getLastQuestion(channel)
  if (lastQuestion) {
      rtm.sendMessage(lastQuestion, channel);
  }
}


const channels = [];
const users = [];
const getChannelsByDateTime = (dateTime) => {
  const channels = users


  return channels;
}

const startDailyMeetUpByDateTime = (dateTime) => {
  const channels = getChannelsByDateTime(dateTime)
  channels.forEach((channel) => {
    startAsk(channel, dateTime)
  })
}

const startAsk = (channel, dateTime) => {
  ask(channel, questions[0])
}

const startDailyMeetup = (channels) => {
  channels.forEach((channel) => {
    askNext(channel)
  });
}
rtm.on(slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  rtmStartData.users.forEach((user) => {
  if (user.name == 'sashaaro')
{
  users.push(user)
}
})

})


rtm.on(slackClient.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
  console.log(gUser)
  //rtm.sendMessage("Hello!", gUser.id);
})

rtm.on(slackClient.RTM_EVENTS.MESSAGE, function (message) {
  console.log('Message:', message) //this is no doubt the lamest possible message handler, but you get the idea
  rtm.sendMessage("Hello!", message.channel);
})

rtm.start()
