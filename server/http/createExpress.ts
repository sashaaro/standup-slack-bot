import * as express from 'express'
import {dashboardExpressMiddleware, useBodyParserAndSession, useStaticPublicFolder} from "./dashboardExpressMiddleware";
import {Container} from "typedi";
import {ApiSlackInteractive} from "./controller/apiSlackInteractive";
import {logError} from "../services/logError";
import { createMessageAdapter } from "@slack/interactive-messages";
import {CONFIG_TOKEN} from "../services/token";

export const createExpress = () => {
  const expressApp = express()

  /*slackInteractions.options({
      //type: InteractiveResponseTypeEnum.message_action
      within: InteractiveResponseWithinEnum.interactive_message
    }, async (response) => {
      try {
        await slackProvider.handleInteractiveAnswers(response)
      } catch (e) {
        logError(e.message)
      }
    }
  )*/

  /*slackInteractions.action({
    type: InteractiveResponseTypeEnum.dialog_submission,
    //type: InteractiveResponseTypeEnum.dialog_submission
  }, async (response, respond) => {
    try {
      await slackProvider.handleInteractiveDialogSubmission(response)
    } catch (e) {
      // TODO if (e instanceof Validation)
      //respond({errors: {}})

      //res.sendStatus(400);
      //res.send();
      logError(e.message)
      return;
    }

    //res.sendStatus(200);

    // respond({text: 'Thanks for submission'})
  })*/

  //const apiSlackInteractiveAction = Container.get(ApiSlackInteractive) as ApiSlackInteractive
  //expressApp.post('/api/slack/interactive', apiSlackInteractiveAction.handle.bind(apiSlackInteractiveAction));



  expressApp.use((req, res, next) => {
    console.log(`${req.originalUrl} ${req.method}`);

    res.on('finish', () => {
      console.info(`${res.statusCode} ${res.statusMessage}; ${res.get('Content-Length') || 0}b sent`)
    })

    next()
  })

  useStaticPublicFolder(expressApp);

  /*const router = express.Router();
  router.get('/', (req, res) => {
    console.log(req.session)

    return res.send('1');
  })*/

  ;
  const slackInteractions = createMessageAdapter(Container.get(CONFIG_TOKEN).slackSigningSecret);
  slackInteractions.action({},  async (response) => {
    try {
      await Container.get(ApiSlackInteractive).handleResponse(response);
    } catch (e) {
      logError(e);
    }
  })

  expressApp.use('/api/slack/interactive', slackInteractions.expressMiddleware());
  useBodyParserAndSession(expressApp);
  expressApp.use('/', dashboardExpressMiddleware());

  return expressApp;
}