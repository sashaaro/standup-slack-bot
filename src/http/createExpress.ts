import express from 'express'
import {dashboardExpressMiddleware, useStaticPublicFolder} from "./dashboardExpressMiddleware";
import {ApiSlackInteractive} from "./controller/apiSlackInteractive";
import {logError} from "../services/logError";
import { createMessageAdapter } from "@slack/interactive-messages";
import {CONFIG_TOKEN} from "../services/token";
import {ReflectiveInjector} from "injection-js";
import {IAppConfig} from "../services/providers";
import {SlackEventAdapter} from "@slack/events-api/dist/adapter";

const consoleLoggerMiddleware = (req, res, next) => {
  console.info(`${req.originalUrl} ${req.method}`);
  res.on('finish', () => {
    console.info(`${res.statusCode} ${res.statusMessage}; ${res.get('Content-Length') || 0}b sent`)
  })

  next()
}

export const createExpress = (injector: ReflectiveInjector) => {
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


  const config: IAppConfig = injector.get(CONFIG_TOKEN)

  if (
    config.debug ||
    true
  ) {
    expressApp.use(consoleLoggerMiddleware)
  }

  useStaticPublicFolder(expressApp);

  const slackInteractions = createMessageAdapter(config.slackSigningSecret);
  slackInteractions.action({},  async (response) => {
    try {
      await injector.get(ApiSlackInteractive).handleResponse(response);
    } catch (e) {
      logError(e);
    }
  })

  expressApp.use('/api/slack/interactive', slackInteractions.expressMiddleware());
  expressApp.use('/api/slack/events', injector.get(SlackEventAdapter).expressMiddleware());
  expressApp.use('/', dashboardExpressMiddleware(injector));

  return expressApp;
}
