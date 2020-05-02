import express from 'express'
import 'express-async-errors';
import getRawBody from "raw-body";
import {Logger} from "winston";
import {createMessageAdapter} from "@slack/interactive-messages";
import {QUEUE_SLACK_INTERACTIVE_RESPONSE} from "../slack/SlackTransport";
import {Queue} from "bullmq";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import {IAppConfig} from "../services/providers";

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

export const createSlackApiExpress = (config: IAppConfig, queue: Queue, slackEvents: SlackEventAdapter, logger: Logger): express.Router => {
  const router = express.Router()

  if (config.debug) {
    router.use(createLoggerMiddleware(logger))
  }

  const slackInteractions = createMessageAdapter(config.slackSigningSecret);
  slackInteractions.action({},  async (response) => {
    await queue.add(QUEUE_SLACK_INTERACTIVE_RESPONSE, response)
  })

  router.use('/interactive', slackInteractions.expressMiddleware());
  router.use('/events', slackEvents.expressMiddleware());

  return router;
}
