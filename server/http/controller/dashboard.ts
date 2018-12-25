import User from "../../model/User";
import Question from "../../model/Question";
import * as pug from 'pug'
import {HttpController, templateDirPath} from "./index";

HttpController.prototype.dashboardAction = async function(req, res) {
    const session = req.session
    if (!session.user) {
        res.send('Access deny')
        return;
    }
    const user = session.user;


    let users = await this.connection.getRepository(User).find({team: user.team_id})

    for(const user of users) {
        user.questions = await this.connection.getRepository(Question).find();
    }

    const authLink = 'https://slack.com/oauth/authorize?&client_id='+this.config.slackClientID+'&scope=bot,channels:read,team:read'


    res.send(pug.compileFile(`${templateDirPath}/dashboard/index.pug`)({
        team: user.team_name,
        authLink: authLink,
        questionList: [],
        users,
        activeMenu: 'reports'
    }))
}
