import {WebClient} from "@slack/client";
import {SlackChannel} from "../../slack/model/SlackChannel";
import Team, {TeamSettings} from "../../model/Team";
import * as pug from 'pug'
import {HttpController, templateDirPath} from "./index";
import {Container} from "typedi";
import {ITimezone} from "../../StandUpBotService";

HttpController.prototype.settingsAction = async function (req, res) {
    const session = req.session
    const timezoneList = Container.get('timezoneList') as Promise<ITimezone[]>;

    if (!session.user) {
        res.send('Access deny') // TODO 403
        return;
    }
    const user = session.user;

    const webClient = new WebClient(session.user.access_token)
    const response = await webClient.channels.list();
    if (!response.ok) {
        throw new Error();
    }
    const channels = (response as any).channels as SlackChannel[]

    let team = await this.connection.getRepository(Team).findOne({id: user.team_id})

    if(!team) {
        // TODO
        throw new Error('team is not found');
    }
    const authLink = 'https://slack.com/oauth/authorize?&client_id='+this.config.slackClientID+'&scope=bot,channels:read,team:read'

    res.send(pug.compileFile(`${templateDirPath}/settings.pug`)({
        team: user.team_name,
        authLink: authLink,
        channels,
        timezoneList: await timezoneList,
        settings: team.settings,
        activeMenu: 'settings'
    }))
}
HttpController.prototype.postSettingsAction = async function(req, res) {
    const timezoneList = Container.get('timezoneList') as Promise<ITimezone[]>;

    const session = req.session
    if (!session.user) {
        res.send('Access deny') // TODO 403
        return;
    }
    const user = session.user;

    const webClient = new WebClient(session.user.access_token)
    const response = await webClient.channels.list();
    if (!response.ok) {
        throw new Error();
    }
    const channels = (response as any).channels

    const teamRepository = this.connection.getRepository(Team);
    let team = await teamRepository.findOne({id: user.team_id})

    if(!team) {
        // TODO
        throw new Error('team is not found');
    }

    if (req.body) {
        // todo validate
        team.settings = <TeamSettings>req.body
        await teamRepository.save(team)
    }

    const authLink = 'https://slack.com/oauth/authorize?&client_id='+this.config.slackClientID+'&scope=bot,channels:read,team:read'


    res.send(pug.compileFile(`${templateDirPath}/settings.pug`)({
        team: user.team_name,
        authLink: authLink,
        channels,
        timezoneList: await timezoneList,
        settings: team.settings,
        activeMenu: 'settings'
    }))
}
