import bodyParser from 'body-parser'
import express from 'express'
import session from 'express-session'
import createRedisConnectStore from 'connect-redis';
import {Injector} from "injection-js";
import {CONFIG_TOKEN, LOG_TOKEN, REDIS_TOKEN} from "../services/token";
import {AuthController} from "./controller/auth.controller";
import {TeamController} from "./controller/team.controller";
import {UserController} from "./controller/user.controller";
import {ChannelController} from "./controller/channel.controller";
import {StandupController} from "./controller/standup.controllert";
import {OptionController} from "./controller/option.controller";
import pinoHttp from "pino-http";
import {createMessageAdapter} from "@slack/interactive-messages";
import {QUEUE_NAME_SLACK_EVENTS, QUEUE_NAME_SLACK_INTERACTIVE} from "../services/providers";
import {ACTION_OPEN_DIALOG, CALLBACK_STANDUP_SUBMIT} from "../slack/slack-bot-transport.service";
import {SlackAction, ViewSubmission} from "../slack/model/ViewSubmission";
import {apiContextMiddleware, emMiddleware} from "./middlewares";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import {QueueRegistry} from "../services/queue.registry";
import {StatController} from "./controller/stat.controller";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {SlackEventListener} from "../slack/slack-event-listener";

const RedisConnectStore = createRedisConnectStore(session);

export class AccessDenyError extends Error {
}

export class ResourceNotFoundError extends Error {
}

export class BadRequestError extends Error {
}


export class ApiMiddleware {
  constructor(private injector: Injector) {}

  use(mikro: MikroORM<PostgreSqlDriver>): express.Router {
    const injector = this.injector;

    const router = express.Router()

    router.use(bodyParser.json());
    router.use(session({
      secret: 'e7d3kd9-standup-slack-bot-session',
      resave: true,
      saveUninitialized: true,
      store: new RedisConnectStore({client: injector.get(REDIS_TOKEN)}),
      // TODO ?! cookie: { secure: true }
    }))

    router.use(emMiddleware(mikro));
    router.use(apiContextMiddleware(injector.get(LOG_TOKEN)));

    const auto = injector.get(AuthController);
    router.get('/auth/session', auto.session);
    router.get('/auth/logout', auto.logout); // TODO DELETE /auth/session?!
    router.get('/auth', auto.auth);

    const team = injector.get(TeamController);
    router.post('/team', team.create);
    router.get('/team', team.list);
    router.get('/team/:id', team.get);
    router.put('/team/:id', team.edit);
    router.get('/timezone', team.timezone);
    router.patch('/team/:id/status', team.status);
    router.get('/team/:id/stats', (req, res) => res.send('dummy!'));

    const user = injector.get(UserController);
    router.get('/user', user.listByWorkspace);

    const channel = injector.get(ChannelController);
    router.get('/channel', channel.listByWorkspace);

    const standup = injector.get(StandupController);
    router.get('/team/:id/standup', standup.list);

    const option = injector.get(OptionController);
    router.get('/option/history/:questionId', option.history);

    const stat = injector.get(StatController);
    router.get('/stat/options/:questionId', stat.options);

    router.use((req: express.Request, res: express.Response, next) => {
      res.status(404);

      if (req.accepts('html')) {
        res.send('404');
        return;
      }

      res.type('txt').send('Not found');
    })

    return router;
  }

  useSlackApi(mikro: MikroORM<PostgreSqlDriver>): express.Router {
    const router = express.Router()

    const config = this.injector.get(CONFIG_TOKEN)
    const queueRegistry = this.injector.get(QueueRegistry);
    const slackEvents = this.injector.get(SlackEventAdapter);
    const logger = this.injector.get(LOG_TOKEN);
    const slackEventListener = this.injector.get(SlackEventListener)

    for (const event of slackEventListener.events()) {
      slackEvents.on(event, async (data) => {
        try {
          //await slackEventListener.evensHandlers[event](data)
          await queueRegistry.create(QUEUE_NAME_SLACK_EVENTS).add(event, data);
        } catch (error) {
          logger.error(error, 'Add job error')
        }
      })
    }

    slackEvents.on('error', (error) => {
      logger.error(error, 'Slack event error')
    })

    if (config.debug) {
      // https://github.com/pinojs/pino-http
      router.use(pinoHttp({
        logger: logger,
        useLevel: 'trace',
      }))
    }

    const slackInteractions = createMessageAdapter(config.slackSigningSecret);
    const queue = queueRegistry.create(QUEUE_NAME_SLACK_INTERACTIVE);

    slackInteractions.viewSubmission(CALLBACK_STANDUP_SUBMIT, async (response: ViewSubmission) => {
      try {
        const job = await queue.add(response);
      } catch (error) {
        logger.error(error, 'Error put slack view submission to queue')
      }
    })
    slackInteractions.action({actionId: new RegExp(
        [ACTION_OPEN_DIALOG].join('|')
      )},  async (response: SlackAction) => {
      try {
        const job = await queue.add(response);
      } catch (error) {
        logger.error(error, 'Error put slack action to queue')
      }
    })


    router.use(emMiddleware(mikro));

    router.use('/interactive', slackInteractions.expressMiddleware());
    router.use('/events', slackEvents.expressMiddleware());

    return router;
  }
}
