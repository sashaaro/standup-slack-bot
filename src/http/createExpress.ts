import express from 'express'
import 'express-async-errors';
import { createMessageAdapter } from "@slack/interactive-messages";
import {IAppConfig} from "../services/providers";
import {QUEUE_SLACK_INTERACTIVE_RESPONSE} from "../slack/SlackTransport";
import {Queue} from "bullmq";
import SlackEventAdapter from "@slack/events-api/dist/adapter";

const consoleLoggerMiddleware = (req, res, next) => {
  console.info(`${req.originalUrl} ${req.method}`);
  res.on('finish', () => {
    console.info(`${res.statusCode} ${res.statusMessage}; ${res.get('Content-Length') || 0}b sent`)
  })

  next()
}

export const createSlackApiExpress = (config: IAppConfig, queue: Queue, slackEvents: SlackEventAdapter): express.Router => {
  const router = express.Router()

  if (config.debug) {
    router.use(consoleLoggerMiddleware)
  }

  const slackInteractions = createMessageAdapter(config.slackSigningSecret);
  slackInteractions.action({},  async (response) => {
    await queue.add(QUEUE_SLACK_INTERACTIVE_RESPONSE, response)
  })

  router.use('/interactive', slackInteractions.expressMiddleware());
  router.use('/events', slackEvents.expressMiddleware());

  return router;
}
