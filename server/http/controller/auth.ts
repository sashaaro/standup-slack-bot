import * as request from 'request-promise'
import * as pug from 'pug'
import {HttpController, templateDirPath} from "./index";

HttpController.prototype.authAction = async function (req, res) {
  const session = req.session;
  const user = session.user;

  if (user) {
    res.redirect('/');
    return;
  }

  if (!req.query.code) {
    const authLink = `https://slack.com/oauth/authorize?&client_id=${this.config.slackClientID}&scope=bot,channels:read,team:read&redirect_uri=${this.config.host}/auth`

    res.send(pug.compileFile(`${templateDirPath}/auth.pug`)({
      authLink: authLink
    }))
    return;
  }
  const link = 'https://slack.com/api/oauth.access';
  const query = `code=${req.query.code}&client_id=${this.config.slackClientID}&client_secret=${this.config.slackSecret}`
  const options = {
    uri: `${link}?${query}`,
    method: 'GET'
  }

  let response
  try {
    response = await request(options)
  } catch (e) {
    console.log(e)
    throw new Error(e)
  }
  const data = JSON.parse(response);
  if (!data.ok) {
    console.log(data);
    throw new Error(data)
  }

  session.user = {
    access_token: data.access_token,
    scope: data.scope,
    user_id: data.user_id,
    team_name: data.team_name,
    team_id: data.team_id,
    bot: data.bot,
  }

  return res.redirect('/')
}
