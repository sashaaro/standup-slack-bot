import * as slackClient from '@slack/client'
import parameters from './parameters'
import {Connection} from "typeorm";
import Team from "./model/Team";
import {RTMAuthenticatedResponse, SlackIm} from "./slack/model/rtm/RTMAuthenticatedResponse";
import {SlackMember} from "./slack/model/SlackUser";
import User from "./model/User";
import Im from "./model/Im";
import Question from "./model/Question";
import Timeout = NodeJS.Timeout;
import {RTMMessageResponse} from "./slack/model/rtm/RTMMessageResponse";

const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'
const questions = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
]

export default class SlackStandupBotClientService {
    protected everyMinutesIntervalID: Timeout;

    constructor (
        private rtm: slackClient.RTMClient,
        private webClient: slackClient.WebClient,
        private connection: Connection) {
    }

    async init () {
        this.rtm.on('connected', () => {
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

        this.rtm.on('authenticated', async (rtmStartData: RTMAuthenticatedResponse) => {
            console.log(`Authenticated to team "${rtmStartData.team.name}"`);
            console.log(rtmStartData);

            const teamRepository = this.connection.getRepository(Team)
            let teamModel = await teamRepository.findOne(rtmStartData.team.id)
            if (!teamModel) {
                teamModel = new Team();
                teamModel.id = rtmStartData.team.id
            }

            await teamRepository.save(teamModel)

            const usersResult = await this.webClient.users.list()

            if (!usersResult.ok) {
                // throw..
                return;
            }
            const users = <SlackMember[]>(usersResult as any).members;
            const userRepository = this.connection.getRepository(User)
            for(const user of users) {
                let userModel = await userRepository.findOne(user.id)
                if (!userModel) {
                    userModel = new User();
                    userModel.id = user.id
                }
                userModel.name = user.name
                userModel.profile = user.profile
                userModel.team = await teamRepository.findOne(user.team_id)

                await userRepository.save(userModel)
            }

            const imResult = await this.webClient.im.list()
            if (!imResult.ok) {
                // throw..
                return;
            }
            const ims = <SlackIm[]>(imResult as any).ims
            const imRepository = this.connection.getRepository(Im)
            for(const imItem of ims) {
                const im = new Im;
                im.created = imItem.created
                im.id = imItem.id
                im.is_im = imItem.is_im
                im.is_user_deleted = imItem.is_user_deleted
                im.is_org_shared = imItem.is_org_shared
                im.priority = imItem.priority
                im.user = await userRepository.findOne(imItem.user)

                await imRepository.save(im)
            }
        })

        this.rtm.on('message', async (message: RTMMessageResponse) => {
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

        }, (error) => {
            console.log(error)
        })
    }

    async findReportChannelsByStartEnd (date): Promise<Team[]> {
        const reportedTeams: Team[] = []

        const teams = await this.connection.getRepository(Team).find()
        for(const team of teams.filter((team) => (team.settings.report_channel))) {
            // todo check writable for bot
            const timeString = this.getTimeString(date, parseFloat(team.settings.timezone))
            const isTime = team.settings.end === timeString

            if (isTime) {
                // TODO ims send to all users.
                reportedTeams.push(team)
            }
        }

        return reportedTeams;
    }

    private getTimeString(date: Date, timezone: number) {
        const minutes = date.getMinutes()
        const hours = date.getUTCHours()
        return ('0' + (hours - date.getTimezoneOffset() + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2)
    }

    async findUserChannelsByStartDate (date: Date): Promise<Im[]> {
        const teams = await this.connection.getRepository(Team).find()
        const userRepository = this.connection.getRepository(User)
        let channels:Im[] = []
        for(const team of teams) {
            const timeString = this.getTimeString(date, parseFloat(team.settings.timezone))
            const inTime = team.settings.start === timeString

            if (inTime) {
                const users = await userRepository.find({team: team})
                for(const user of users) {
                    user.ims.forEach(im => {
                        if (channels.filter(cim => (cim.id === im.id)).length === 0) {
                            channels.push(im)
                        }
                    })
                }
            }
        }

        return channels;
    }

    async answer (message: RTMMessageResponse) {
        const meetUpInProcess = true // TODO
        if (!meetUpInProcess) {
                // TODO
            return 'wtf!'
        }

        const questionRepository = this.connection.getRepository(Question)

        const question = await questionRepository.
            createQueryBuilder('q')
            //.innerJoin('q.im', 'im')
            //.where('im.id := :imid', {imid: message.channel}).getOne()
            .where('q.im = :im', {im: message.channel}).getOne()

        console.log('Message for question')
        console.log(message)
        console.log(question)

        if (!question) {
            // TODO
            return 'wtf'
        }

        /*await questionRepository.update(question._id, <Question>{
            answer: message.text
        });*/
        const nextQuestion = await this.askQuestion(question.im, question.index + 1);
        if (!nextQuestion) {
            console.log(`question.im ${question.im}`)
            this.send(question.im, standUpGoodBye)
            return;
        }
    }

    standUpForNow () {
        const now = new Date()
        this.startDailyMeetUpByDate(now).then()
    }

    startStandUpInterval () {
        this.standUpForNow()
        this.everyMinutesIntervalID = setInterval(this.standUpForNow.bind(this), 60 * 1000) // every minutes
    }

    async startDailyMeetUpByDate (date) {
        // start ask users
        const userChannels = await this.findUserChannelsByStartDate(date)

        for(const userChannel of userChannels) {
            console.log('userChannel')
            console.log(userChannel)
            await this.startAsk(userChannel)
        }

        // send report for end of meetup
        /*const reportedTeams = await this.findReportChannelsByStartEnd(date);
        for(const reportedTeam of reportedTeams) {
            const reportText = 'Report ...';
            const im = await this.connection.getRepository(Im).findOne({id: reportedTeam.settings.report_channel});
            if (im) {
                this.send(im, reportText);
            } else {
                console.log('Report channel is not found')
            }
        }*/
    }

    async startAsk (channel: Im) {

        console.log(`startAsk ${channel}`)
        console.log(channel)
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

        await this.send(question.im, question.text)
        await this.connection.getRepository(Question).save(question)

        return true
    }

    send (channel: Im, text): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('Send to channel')
            console.log(channel)
            if (!channel) { // TODO remove
                reject('')
                return;
            }
            this.rtm.sendMessage(text, channel.id).then(result => {
                if (result.error) {
                    console.log(result.error)
                    reject(result.error)
                } else {
                    resolve()
                }
            }, (error) => {
                console.log(error);
                reject(error)
            })
        })
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
    }
}
