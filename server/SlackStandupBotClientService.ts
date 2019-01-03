import * as slackClient from '@slack/client'
import {
    BeforeInsert,
    Column,
    Connection,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
    PrimaryGeneratedColumn
} from "typeorm";
import Team, {TeamSettings} from "./model/Team";
import {RTMAuthenticatedResponse, SlackIm} from "./slack/model/rtm/RTMAuthenticatedResponse";
import {SlackMember} from "./slack/model/SlackUser";
import User from "./model/User";
import Im from "./model/Im";
import Question from "./model/Question";
import Timeout = NodeJS.Timeout;
import {RTMMessageResponse} from "./slack/model/rtm/RTMMessageResponse";
import Answer from "./model/Answer";
import StandUp from "./model/StandUp";
import {Service} from "typedi";
import {Observable} from "rxjs";


const standUpGreeting = 'Good morning/evening. Welcome to daily standup'
const standUpGoodBye = 'Have good day. Good bye.'


export interface ITimezone {
    name: 'Pacific/Kosrae',
    abbrev: '+11',
    utc_offset: { hours: 11 },
    is_dst: false
}

export interface ITeamSettings
{
    timezone: string
    start: string
    end: string
}

export interface ITransport {
    sendMessage(user: IUser, message: string): Promise<void>
    message$: Observable<Answer>
}


export interface IUser
{
    id: string|number
    name: string
    team: Team;
}

export interface ITeam
{
    id: string|number;
    settings: ITeamSettings;
    users: IUser[]
}

export interface IQuestion
{
    id: string|number;
    // index: number;
    text: string;
    //disabled: boolean;
    createdAt: Date;
    team: Team;
}

export interface IMessage
{
    user: IUser,
    text: string,
    team?: ITeam
}


export interface IAnswer
{
    id: string|number
    user: IUser;
    standUp: StandUp;
    question: IQuestion
    message: string
    createdAt: Date;
}

export interface IStandUp {
    id: number|string;
    team: ITeam

    start: Date;
    end: Date;
    answers: IAnswer[];
}

export interface IStandUpProvider {
    startTeamStandUpByDate(): Promise<IStandUp[]>
    createStandUp(): IStandUp
    insert(standUp: IStandUp): Promise<any>
    findProgressByTeam(team: ITeam): Promise<IStandUp>
    findLastNoReplyAnswer(standUp: IStandUp, user: IUser): Promise<Answer>
    updateAnswer(answer: IAnswer): Promise<Answer>
}

export interface ITeamProvider {
    all(): Promise<Team[]>
}

interface ITimezoneProvider {
    (): Promise<ITimezone[]>
}


class SlackProvider implements IStandUpProvider, ITeamProvider, ITransport {
    message$: Observable<Answer>;

    constructor (
        private rtm: slackClient.RTMClient,
        private webClient: slackClient.WebClient,
        private connection: Connection) {
    }

    sendMessage(user: IUser, message: string): Promise<void> {
        return undefined;
    }


    init() {
        const userRepository = this.connection.getRepository(User)

        this.rtm.on('connected', () => {
            console.log('Connection opened')

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
            for(const user of users.filter(u => !u.is_bot && !u.deleted)) {
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
            for(const imItem of ims.filter(im => !im.is_user_deleted)) {
                const user = await userRepository.findOne(imItem.user)
                user.im = imItem.id
                await userRepository.save(user)
            }
        })

        this.message$ = Observable.create((observer) => {
            this.rtm.on('message', async (messageResponse: RTMMessageResponse) => {
                // be sure it is direct message to bot
                if (!userRepository.findOne({where: {im: messageResponse.channel}})) {
                    console.log(`User channel ${messageResponse.channel} is not im`)

                    // TODO try update from api
                    return
                }

                const message = {
                    team: await this.connection.getRepository(Team).findOne(messageResponse.team),
                    text: messageResponse.text,
                    user: await this.connection.getRepository(User).findOne(messageResponse.user)
                } as IMessage

                observer.next(message)
            })
        })

        this.rtm.on('error', async (message) => {
            console.log(message)
            this.stopInterval()
        })
    }

    all(): Promise<Team[]> {
        return this.connection.getRepository(Team)
            .createQueryBuilder('team')
            .leftJoinAndSelect('team.users', 'users')
            .getMany();
    }

    createStandUp(): StandUp {
        return new StandUp();
    }

    insert(standUp: StandUp): Promise<any> {
        const standUpRepository = this.connection.getRepository(StandUp)

        return standUpRepository.insert(standUp)
    }

    startTeamStandUpByDate(): Promise<IStandUp[]> {
        return undefined;
    }

    async findProgressByTeam(team: ITeam): Promise<StandUp> {
        const standUpRepository = this.connection.getRepository(StandUp)
        return await standUpRepository.createQueryBuilder('st')
        .where('st.team = :team', {team: message.team})
        // .andWhere('st.end IS NULL')
        .orderBy('st.start', "DESC")
        .getOne();
    }

    async findLastNoReplyAnswer(standUp: StandUp, user: User): Promise<Answer> {
        const answerRepository = this.connection.getRepository(Answer)
        return await answerRepository.createQueryBuilder('a')
            .leftJoinAndSelect("a.user", "user")
            .leftJoinAndSelect("a.question", "question")
            .innerJoinAndSelect("a.standUp", "standUp")
            .where('user.id = :userID', {userID: user.id})
            .andWhere('a.message IS NULL')
            .andWhere('standUp.id = :standUp', {standUp: standUp.id})
            .getOne()
    }

    async updateAnswer(lastNoReplyAnswer: Answer): Promise<Answer> {
        const answerRepository = this.connection.getRepository(Answer)

        return answerRepository.save(lastNoReplyAnswer);
    }
}





const getTimezoneList = (connection: Connection): ITimezoneProvider => (
    (() => (connection.query('select * from pg_timezone_names LIMIT 10') as Promise<ITimezone[]>)) as ITimezoneProvider
)


@Service()
export default class SlackStandupBotClientService {
    protected everyMinutesIntervalID: Timeout;

    constructor(protected teamProvider: ITeamProvider,
        protected standUpProvider: IStandUpProvider,
        protected transport: ITransport) {
    }


    async start () {
        const now = new Date()
        const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds()
        const millisecondsDelay = 60 * 1000 - milliseconds

        console.log('Wait delay ' + millisecondsDelay + ' milliseconds for run loop')
        //setTimeout(() => {
        console.log('StandUp interval starting')
        this.startStandUpInterval()
        //}, millisecondsDelay)

        this.transport.message$.subscribe((message: IMessage) => {
            this.answerAndSendNext(message)
        })
    }

    start() {
        this.rtm.start().then(() => {

        }, (error) => {
            console.log(error)
        })
    }

    async startTeamStandUpByDate (date: Date): Promise<IStandUp[]> {
        let standUps: IStandUp[] = [];
        const teams = await this.teamProvider.all()

        for(const team of teams) {
            const timezone = parseFloat(team.settings.timezone)
            const timeString = this.getTimeString(date, timezone)
            const inTime = team.settings.start === timeString

            if (inTime) {
                const standUp = this.standUpProvider.createStandUp();
                standUp.team = team
                standUp.end = new Date()

                const [hours, minutes] = team.settings.end.split(':')
                standUp.end.setHours(parseInt(hours) + timezone);
                standUp.end.setMinutes(parseInt(minutes));

                await this.standUpProvider.insert(standUp)
                standUps.push(standUp);
            }
        }

        return standUps;
    }

    async endTeamStandUpByDate (date): Promise<StandUp[]> {
        const standUpRepository = this.connection.getRepository(StandUp)
        let standUps: StandUp[] = [];

        const now = new Date();
        now.setSeconds(0)
        now.setMilliseconds(0)
        const endStandUps = standUpRepository.createQueryBuilder('st')
        .where('TO_CHAR(st.end, \'YYYY-MM-DD HH24:MI\') = TO_CHAR(NOW()::timestamp at time zone \'Europe/Moscow\', \'YYYY-MM-DD HH24:MI\')')
            .getMany()

        for(const team of await this.connection.getRepository(Team).find()) {
            const timeString = this.getTimeString(date, parseFloat(team.settings.timezone))
            const inTime = team.settings.end === timeString
        }

        return standUps;
    }

    private getTimeString(date: Date, timezone: number) {
        const minutes = date.getMinutes()
        const hours = date.getUTCHours()
        return ('0' + (hours - date.getTimezoneOffset() + timezone)).slice(-2) + ':' + ('0' + minutes).slice(-2)
    }

    async answerAndSendNext(message: IMessage): Promise<Answer> {
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

    async answer(message: IMessage): Promise<Answer> {
        const progressStandUp = await this.standUpProvider.findProgressByTeam(message.team)

        if (!progressStandUp) {
            console.log('no progress stand up')
            return new Promise<Answer>((resolve, reject) => {
                reject('no progress stand up')
            })
        }

        const lastNoReplyAnswer = await this.standUpProvider.findLastNoReplyAnswer(progressStandUp, message.user);

        if (!lastNoReplyAnswer) {
            console.log('lastNoReplyAnswer is not found')
            // TODO
            return new Promise((r,e) => (e('lastNoReplyAnswer is not found')))
        }

        lastNoReplyAnswer.message = message.text
        return this.standUpProvider.updateAnswer(lastNoReplyAnswer)
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
            for(const user of standUp.team.users) {
                await this.startAsk(user, standUp)
            }
        }


        const endedStandUps = await this.endTeamStandUpByDate(date);
        for(const endedStandUp of endedStandUps) {
            endedStandUp.end = new Date();
            await this.connection.getRepository(StandUp).save(endedStandUp)
            const reportText = 'Report ...';
            const im = await this.connection.getRepository(Im).findOne(endedStandUp.team.settings.report_channel);
            if (!im) {
                console.log('Report channel is not found')
                continue;
            }
            await this.send(im, reportText);
        }
    }

    async startAsk(user: IUser, standUp: IStandUp) {
        this.send(user, standUpGreeting)
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

    async send (user: IUser, text: string): Promise<void> {
        return await this.transport.sendMessage(user, text)
        /*const result = await this.rtm.sendMessage(text, channel.id)
        if (!result.error) {
            console.log(result.error)
            throw new Error(result.error.msg)
        }*/
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
