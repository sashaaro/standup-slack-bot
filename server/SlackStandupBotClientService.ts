import * as slackClient from '@slack/client'
import parameters from './parameters'
import {Connection} from "typeorm";
import Team from "./model/Team";
import { SlackTeam } from "./slack/model/SlackTeam";
import { RTMAuthenticatedResponse } from "./slack/model/rtm/RTMAuthenticatedResponse";
import {SlackUser} from "./slack/model/SlackUser";
import User from "./model/User";


const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'
const questions = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
]

export default class SlackStandupBotClientService {
    protected rtm: slackClient.RtmClient;
    protected connection: Connection;
    protected everyMinutesIntervalID: number;

    constructor (rtm: slackClient.RtmClient, connection: Connection) {
        this.rtm = rtm;
        this.connection = connection;
        // TODO logger
    }

    async init () {
        this.rtm.on(slackClient.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
            console.log('Connection opened')
            const now = new Date()
            const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds()
            const millisecondsDelay = 60 * 1000 - milliseconds

            console.log('Wait delay ' + millisecondsDelay + ' milliseconds for run loop')
            // TODO setTimeout(() => {
            console.log('StandUp interval starting')
            this.startStandUpInterval()
            //}, millisecondsDelay)
        })

        this.rtm.on(slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, async (rtmStartData: RTMAuthenticatedResponse) => {
            console.log('Authenticated ' + rtmStartData.team.name);


            const teamRepository = this.connection.getRepository(Team)
            let teamModal = await teamRepository.findOneById(rtmStartData.team.id)
            if (!teamModal) {
                teamModal = new Team();
                teamModal.id = rtmStartData.team.id
            }

            await this.connection.entityManager.persist(teamModal)
            console.log(teamModal);
            //await this.teamsCollection.updateOne({id: team.id}, {$set: team}, {upsert: true})

            for(const im of rtmStartData.ims) {
                //await this.imsCollection.updateOne({id: im.id}, {$set: im}, {upsert: true})
            }


            //const users = rtmStartData.users;
            //const users = rtmStartData.users.filter((user) => (user.name === 'sashaaro'));
            const userRepository = this.connection.getRepository(User)
            for(const user of rtmStartData.users) {
                let userModal = await userRepository.findOneById(user.id)
                if (!userModal) {
                    userModal = new User();
                    userModal.id = user.id
                    userModal.name = user.name

                    const teamModal = await teamRepository.findOneById(user.team_id)
                    userModal.team = teamModal
                }
                await this.connection.entityManager.persist(userModal)
            }
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

        /*if (!await this.usersCollection.ensureIndex({ "id": 1 }, { unique: true })) {
            await this.usersCollection.createIndex({ "id": 1 }, { unique: true })
        }

        if (!await this.teamsCollection.ensureIndex({ "id": 1 }, { unique: true })) {
            await this.teamsCollection.createIndex({ "id": 1 }, { unique: true })
        }
        if (!await this.imsCollection.ensureIndex({ "id": 1 }, { unique: true })) {
            await this.imsCollection.createIndex({ "id": 1 }, { unique: true })
        }*/
    }

    start() {
        this.rtm.start()
    }

    async findReportChannelsByStartEnd (date) {
        const reportedTeams = []

        /*const teams = await this.teamsCollection.find().toArray()
        for(const team of teams) {
            if (!team.settings) {
                team.settings = parameters.defaultSettings
                await this.teamsCollection.updateOne({_id: team._id}, {$set: {settings: team.settings}})
            }

            if (!team.settings.report_channel) {
                continue;
            }
            // todo check writable for bot

            const minutes = date.getMinutes()
            const hours = date.getUTCHours()
            const timezone = parseFloat(team.settings.timezone)

            const isSame = team.settings.end === (('0' + (hours + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2))
            //const isSame = true

            if (isSame) {
                // TODO ims send to all users.
                reportedTeams.push(team)
            }
        }*/

        return reportedTeams;
    }

    async findUserChannelsByStartDate (date) {
        /*const teams = await this.teamsCollection.find().toArray()
        let channels = []
        for(const team of teams) {
            if (!team.settings) {
                team.settings = parameters.defaultSettings
                await this.teamsCollection.updateOne({_id: team._id}, {$set: {settings: team.settings}})
            }

            const minutes = date.getMinutes()
            const hours = date.getUTCHours()
            const timezone = parseFloat(team.settings.timezone)
            const isSame = team.settings.start === (('0' + (hours + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2))
            //const isSame = true
            if (isSame) {
                const users = await this.usersCollection.find({team_id: team.id}, ['id']).toArray()
                const userIDs = users.map((user) => (user.id))
                const ims = await this.imsCollection.find({user: {$in: userIDs}}).toArray()

                channels = channels.concat(channels, ims.map((im) => (im.id)))
            }
        }

        return channels;*/
    }

    async answer (message) {
        /*const meetUpInProcess = true // TODO
        if (meetUpInProcess) {
            const question = await this.questionsCollection.findOne({
                user_channel: message.channel,
                answer: {$exists: false}
                // created_at: today
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
        }*/
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
        /*const userChannels = await this.findUserChannelsByStartDate(date)
        userChannels.forEach((userChannel) => {
            this.startAsk(userChannel)
        })

        // send report for end of meetup
        const reportedTeams = await this.findReportChannelsByStartEnd(date);
        for(const reportedTeam of reportedTeams) {
            const reportText = 'Report ...';
            this.send(reportedTeam.settings.report_channel, reportText);
        }*/
    }

    startAsk (channel) {
        this.send(channel, standUpGreeting)
        //setTimeout(() => {
        this.askQuestion(channel, 0)
        //}, 1500)
    }

    async askQuestion(channel, questionIndex) {
        /*if (!questions[questionIndex]) {
            return false;
        }
        this.send(channel, questions[questionIndex])
        await this.questionsCollection.insertOne({
            user_channel: channel,
            index: questionIndex
        })*/

        return true
    }

    send (channel, text) {
        if (parameters.debug) {
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