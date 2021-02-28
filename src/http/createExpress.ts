import express from 'express'
import 'express-async-errors';
import getRawBody from "raw-body";
import {Logger} from "winston";
import {createMessageAdapter} from "@slack/interactive-messages";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import {IAppConfig, QUEUE_NAME_SLACK_EVENTS, QUEUE_NAME_SLACK_INTERACTIVE} from "../services/providers";
import {IQueueFactory} from "../services/token";
import {SlackAction, ViewSubmission} from "../slack/model/ViewSubmission";
import {ACTION_OPEN_DIALOG, ACTION_OPEN_REPORT, CALLBACK_STANDUP_SUBMIT} from "../slack/slack-bot-transport.service";

export const createLoggerMiddleware = (logger: Logger) => (req: express.Request, res: express.Response, next) => {
  (req.originalUrl.startsWith('/api/slack') && req.method === "POST" ? getRawBody(req) : Promise.resolve(null)).then(buff => {
    logger.debug('Request', {
      url: req.originalUrl,
      method: req.method,
      body: buff?.toString(),
      headers: JSON.stringify(req.headers)
    })
  })

  res.on('finish', () => {
    logger.debug(`Response ${res.get('Content-Length') || 0}b sent`, {
      status: res.statusCode,
      method: req.method,
    })
  })

  next()
}

export const createSlackApiExpress = (
  config: IAppConfig,
  queueFactory: IQueueFactory,
  slackEvents: SlackEventAdapter,
  logger: Logger
): express.Router => {
  const router = express.Router()

  if (config.debug) {
    router.use(createLoggerMiddleware(logger))
  }

  const slackInteractions = createMessageAdapter(config.slackSigningSecret);
  const queue = queueFactory(QUEUE_NAME_SLACK_INTERACTIVE);

  slackInteractions.viewSubmission(CALLBACK_STANDUP_SUBMIT, async (response: ViewSubmission) => {
    try {
      const job = await queue.add(response);
    } catch (error) {
      logger.error('Error put slack view submission to queue', {error})
    }
  })
  slackInteractions.action({actionId: new RegExp(
      [ACTION_OPEN_DIALOG, ACTION_OPEN_REPORT].join('|')
    )},  async (response: SlackAction) => {
    try {
      const job = await queue.add(response);
    } catch (error) {
      logger.error('Error put slack action to queue', {error})
    }
  })

  router.use('/interactive', slackInteractions.expressMiddleware());
  router.use('/events', slackEvents.expressMiddleware());

  return router;
}
