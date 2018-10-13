import * as slackClient from '@slack/client'
import parameters from './parameters'
import {Connection} from "typeorm";
import Team from "./model/Team";
import { SlackTeam } from "./slack/model/SlackTeam";
import { RTMAuthenticatedResponse } from "./slack/model/rtm/RTMAuthenticatedResponse";
import {SlackUser} from "./slack/model/SlackUser";
import User from "./model/User";
import Im from "./model/Im";
import Question from "./model/Question";
import Timeout = NodeJS.Timeout;

const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'
const questions = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
]

export default class SlackStandupBotClientService {
    protected rtm: slackClient.RTMClient;
    protected connection: Connection;
    protected everyMinutesIntervalID: Timeout;

    constructor (rtm: slackClient.RTMClient, connection: Connection) {
        this.rtm = rtm;
        this.connection = connection;
        // TODO logger
    }

    async init () {
        this.rtm.on('connected', () => {
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

        this.rtm.on('authenticated', async (rtmStartData: RTMAuthenticatedResponse) => {
            console.log('Authenticated ' + rtmStartData.team.name);

            const teamRepository = this.connection.getRepository(Team)
            let teamModal = await teamRepository.findOne(rtmStartData.team.id)
            if (!teamModal) {
                teamModal = new Team();
                teamModal.id = rtmStartData.team.id
            }

            await teamRepository.save(teamModal)

            const userRepository = this.connection.getRepository(User)
            for(const user of rtmStartData.users) {
                let userModal = await userRepository.findOne(user.id)
                if (!userModal) {
                    userModal = new User();
                    userModal.id = user.id
                }
                userModal.name = user.name
                userModal.profile = user.profile
                userModal.team = await teamRepository.findOne(user.team_id)

                await userRepository.save(userModal)
            }

            const imRepository = this.connection.getRepository(Im)
            for(const imItem of rtmStartData.ims) {
                const im = new Im;
                im.created = imItem.created
                im.has_pins = imItem.has_pins
                im.id = imItem.id
                im.is_im = imItem.is_im
                im.is_open = imItem.is_open
                im.is_org_shared = imItem.is_org_shared
                im.last_read = imItem.last_read
                im.user = await userRepository.findOne(imItem.user)

                await imRepository.save(im)
            }
        })

        this.rtm.on('message', async (message) => {
            console.log(message)
            if (!this.existChannel(message.channel)) {
                // TODO log
                //return
            }

            await this.answer(message)
        })

        this.rtm.on('error', async (message) => {
            console.log(message)
            this.stopInterval()
        })
    }

    start() {
        this.rtm.start().then(() => {

        })
    }

    async findReportChannelsByStartEnd (date): Promise<Team[]> {
        const reportedTeams: Team[] = []

        const teams = await this.connection.getRepository(Team).find()
        for(const team of teams) {
            if (!team.settings.report_channel) {
                // TODO log
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
        }

        return reportedTeams;
    }

    async findUserChannelsByStartDate (date): Promise<Im[]> {
        const teams = await this.connection.getRepository(Team).find()
        const userRepository = this.connection.getRepository(User)
        let channels:Im[] = []
        for(const team of teams) {
            const minutes = date.getMinutes()
            const hours = date.getUTCHours()
            const timezone = parseFloat(team.settings.timezone)
            const isSame = team.settings.start === (('0' + (hours + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2))
            //const isSame = true
            if (isSame) {
                const users = await userRepository.find({team: team})
                for(const user of users) {
                    console.log(user.ims);
                    channels = channels.concat(channels, user.ims.map((im) => (im)))
                }
            }
        }

        return channels;
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
        this.startDailyMeetUpByDate(now).then()
    }

    startStandUpInterval () {
        this.standUpForNow()
        // todo every 5 minutes
        this.everyMinutesIntervalID = setInterval(this.standUpForNow.bind(this), 60 * 1000) // every minutes
    }

    async startDailyMeetUpByDate (date) {
        // start ask users

        const userChannels = await this.findUserChannelsByStartDate(date)
        for(const userChannel of userChannels) {
            await this.startAsk(userChannel)
        }

        // send report for end of meetup
        const reportedTeams = await this.findReportChannelsByStartEnd(date);
        for(const reportedTeam of reportedTeams) {
            const reportText = 'Report ...';
            const im = await this.connection.getRepository(Im).findOne({id: reportedTeam.settings.report_channel});
            this.send(im, reportText);
        }
    }

    async startAsk (channel: Im) {
        this.send(channel, standUpGreeting)
        //setTimeout(() => {
        await this.askQuestion(channel, 0)
        //}, 1500)
    }

    async askQuestion(channel: Im, questionIndex) {
        if (!questions[questionIndex]) {
            return false;
        }
        const text = questions[questionIndex];

        const question = new Question();
        question.index = questionIndex;
        question.im = channel;
        question.text = text

        this.send(channel, question.text)
        await this.connection.getRepository(Question).save(question)

        return true
    }

    send (channel: Im, text) {
        if (parameters.debug) {
            console.log(text);
        } else {
            this.rtm.sendMessage(text, channel.id)
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
        this.rtm.disconnect()
        //this.mongodb.close()
    }
}