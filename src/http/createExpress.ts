import express from 'express'
import 'express-async-errors';
import getRawBody from "raw-body";
import {Logger} from "winston";
import {createMessageAdapter} from "@slack/interactive-messages";
import {QUEUE_SLACK_INTERACTIVE_RESPONSE} from "../slack/SlackTransport";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import {IAppConfig, QUEUE_MAIN_NAME} from "../services/providers";
import {IQueueFactory} from "../services/token";
import * as fs from "fs";

export const createLoggerMiddleware = (logger: Logger) => (req: express.Request, res: express.Response, next) => {
  if (req.originalUrl.startsWith('/api/slack') && req.method === "POST") {
    getRawBody(req).then(buff => {
      logger.info('Request', {
        url: req.originalUrl,
        method: req.method,
        body: buff.toString()
      })
    })
  } else {
    logger.info('Request', {
      url: req.originalUrl,
      method: req.method,
    })
  }

  res.on('finish', () => {
    logger.info(`Response ${res.get('Content-Length') || 0}b sent`, {
      status: res.statusCode,
      method: req.method,
    })
  })

  next()
}

export const createSlackApiExpress = (config: IAppConfig, queueFactory: IQueueFactory, slackEvents: SlackEventAdapter, logger: Logger): express.Router => {
  const router = express.Router()

  if (config.debug) {
    router.use(createLoggerMiddleware(logger))
  }

  const slackInteractions = createMessageAdapter(config.slackSigningSecret);
  const queue = queueFactory(QUEUE_MAIN_NAME);
  slackInteractions.action({},  async (response) => {
    try {
      const job = await queue.add(QUEUE_SLACK_INTERACTIVE_RESPONSE, response)
    } catch (e) {
      logger.error('Add queue', {error: e})

      fs.appendFile(`var/failed-jobs.log`, JSON.stringify({name: QUEUE_SLACK_INTERACTIVE_RESPONSE, response}) + '\n' , (err) =>  {
        if (err) {
          logger.error('Save failed job', {error: err})
        }
      });
    }
  })

  router.use('/interactive', slackInteractions.expressMiddleware());
  router.use('/events', slackEvents.expressMiddleware());

  return router;
}
