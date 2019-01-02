import * as slackClient from '@slack/client'
import {Connection} from "typeorm";
import Team from "./model/Team";
import {RTMAuthenticatedResponse, SlackIm} from "./slack/model/rtm/RTMAuthenticatedResponse";
import {SlackMember} from "./slack/model/SlackUser";
import User from "./model/User";
import Im from "./model/Im";
import Question from "./model/Question";
import Timeout = NodeJS.Timeout;
import {RTMMessageResponse} from "./slack/model/rtm/RTMMessageResponse";
import Answer from "./model/Answer";
import StandUp from "./model/StandUp";

const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'

export default class SlackStandupBotClientService {
    protected everyMinutesIntervalID: Timeout;

    constructor (
        private rtm: slackClient.RTMClient,
        private webClient: slackClient.WebClient,
        private connection: Connection) {
    }

    async init () {
        const userRepository = this.connection.getRepository(User)
        const imRepository = this.connection.getRepository(Im)

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
            if (!imRepository.findOne(message.channel)) {
                console.log(`Message channel ${message.channel} is not im`)

                // TODO try update from api
                return
            }

            await this.answerAndSendNext(message)
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

    async startTeamStandUpByDate (date: Date): Promise<StandUp[]> {
        const standUpRepository = this.connection.getRepository(StandUp)
        let standUps: StandUp[] = [];
        for(const team of await this.connection.getRepository(Team).find()) {
            const timeString = this.getTimeString(date, parseFloat(team.settings.timezone))
            const inTime = team.settings.start === timeString

            if (inTime) {
                const standUp = new StandUp();
                standUp.team = team
                await standUpRepository.insert(standUp)
                standUps.push(standUp);
            }
        }

        return standUps;
    }

    async endTeamStandUpByDate (date): Promise<StandUp[]> {
        const standUpRepository = this.connection.getRepository(StandUp)
        let standUps: StandUp[] = [];
        for(const team of await this.connection.getRepository(Team).find()) {
            const timeString = this.getTimeString(date, parseFloat(team.settings.timezone))
            const inTime = team.settings.end === timeString

            if (inTime) {
                const standUp = new StandUp();
                standUp.team = team
                await standUpRepository.insert(standUp)
                standUps.push(standUp);
            }
        }

        return standUps;
    }

    private getTimeString(date: Date, timezone: number) {
        const minutes = date.getMinutes()
        const hours = date.getUTCHours()
        return ('0' + (hours - date.getTimezoneOffset() + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2)
    }

    async answerAndSendNext(message: RTMMessageResponse): Promise<Answer> {
        const repliedAnswer = await this.answer(message)

        const nextQuestion = await this.connection.getRepository(Question).findOne({
            where: {
                index: repliedAnswer.question.index + 1,
                team: message.team
            }
        })

        if (!nextQuestion) {
            console.log('Next question is not found')
            this.send(repliedAnswer.im, standUpGoodBye)
            return;
        }

        return await this.askQuestion(repliedAnswer.im, nextQuestion, repliedAnswer.standUp);
    }

    async answer(message: RTMMessageResponse): Promise<Answer> {
        const standUpRepository = this.connection.getRepository(StandUp)
        const progressStandUp = standUpRepository.createQueryBuilder('st')
            .where('st.team = :team', {team: message.team})
            .andWhere('st.end IS NULL')
            .getOne();

        if (!progressStandUp) {
            console.log('no progress stand up')
            return new Promise<Answer>((resolve, reject) => {
                reject('no progress stand up')
            })
        }

        const answerRepository = this.connection.getRepository(Answer)

        const lastNoReplyAnswer = await answerRepository.
            createQueryBuilder('a')
            //.innerJoin('q.im', 'im')
            //.where('im.id := :imid', {imid: message.channel}).getOne()
            .where('a.im = :im', {im: message.channel})
            .andWhere('a.message IS NULL')
            .andWhere('a.standUp = :standUp', {standUp: progressStandUp})
            .leftJoinAndSelect("a.im", "im")
            .leftJoinAndSelect("a.question", "question")
            .getOne()

        if (!lastNoReplyAnswer) {
            console.log('lastNoReplyAnswer is not found')
            // TODO
            return new Promise((r,e) => (e('lastNoReplyAnswer is not found')))
        }

        lastNoReplyAnswer.message = message.text
        return answerRepository.save(lastNoReplyAnswer);

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
        const standUps = await this.startTeamStandUpByDate(date)

        for(const standUp of standUps) {
            let channels: Im[] = [];
            for(const user of await standUp.team.users) {
                user.ims.forEach(im => {
                    if (channels.filter(cim => (cim.id === im.id)).length === 0) {
                        channels.push(im)
                    }
                })
            }

            for(const channel of channels) {
                await this.startAsk(channel, standUp)
            }
        }


        const endedStandUps = await this.endTeamStandUpByDate(date);
        for(const endedStandUp of endedStandUps) {
            endedStandUp.end = new Date();
            await this.connection.getRepository(StandUp).save(endedStandUp)
            const reportText = 'Report ...';
            const im = await this.connection.getRepository(Im).findOne({id: endedStandUp.team.settings.report_channel});
            if (!im) {
                console.log('Report channel is not found')
                continue;
            }
            await this.send(im, reportText);
        }
    }

    async startAsk(channel: Im, standUp: StandUp) {
        this.send(channel, standUpGreeting)
        //setTimeout(() => {


        const question = await this.connection.getRepository(Question).findOne(); // TODO filter
        if (!question) {
            console.log('No questions')
            return;
        }
        await this.askQuestion(channel, question, standUp)
        //}, 1500)
    }

    async askQuestion(channel: Im, question: Question, standUp: StandUp): Promise<Answer> {
        const answer = new Answer()

        answer.im = channel;
        answer.question = question;
        answer.standUp = standUp;

        await this.send(answer.im, question.text)
        await this.connection.getRepository(Answer).insert(answer)

        return answer
    }

    send (channel: Im, text): Promise<void> {
        return new Promise((resolve, reject) => {
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

    stopInterval() {
        clearInterval(this.everyMinutesIntervalID);
        this.everyMinutesIntervalID = null
    }

    stop () {
        this.stopInterval()
        this.rtm.disconnect()
    }
}
