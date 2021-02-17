import bodyParser from 'body-parser'
import express from 'express'
import session from 'express-session'
import createRedisConnectStore from 'connect-redis';
import {Injector} from "injection-js";
import {Connection} from "typeorm";
import ApiContext from "../services/ApiContext";
import {LOGGER_TOKEN, REDIS_TOKEN} from "../services/token";
import {AuthController} from "./controller/auth.controller.";
import http from "http";
import {TeamController} from "./controller/team.controller";
import {UsersController} from "./controller/users.controller";

const RedisConnectStore = createRedisConnectStore(session);

declare global {
  namespace Express {
    interface Request {
      context: ApiContext
    }
  }
}

export const createApiContextMiddleware = (connection: Connection) => {
  return async (req: http.IncomingMessage | express.Request | express.Router | any, res, next) => {
    const context = new ApiContext(req.session, connection);
    await context.init();
    req.context = context;

    next()
  }
}

export class AccessDenyError extends Error {
}

export class ResourceNotFoundError extends Error {
}

export class BadRequestError extends Error {
}

export const apiExpressMiddleware = (injector: Injector): express.Router => {
  const router = express.Router()

  router.use(bodyParser.json());
  router.use(session({
    secret: 'e7d3kd9-standup-slack-bot-session',
    resave: true,
    saveUninitialized: true,
    store: new RedisConnectStore({client: injector.get(REDIS_TOKEN)}),
    //cookie: { secure: true }
  }))

  router.use(createApiContextMiddleware(injector.get(Connection)));

  const auto = injector.get(AuthController);
  const team = injector.get(TeamController);
  const user = injector.get(UsersController);

  router.get('/auth/session', auto.session);
  router.get('/auth/logout', auto.logout); // TODO DELETE /auth/session?!
  router.get('/auth', auto.auth);

  router.post('/team', team.create);
  router.get('/team', team.list);

  router.all('/team/:id', team.standups);
  router.all('/team/:id/edit', team.edit);
  router.all('/team/:id/stats', team.stats);
  router.put('/team/:id/isEnabled', team.putIsEnabled);
  router.get('/user', user.listByWorkspace);

  router.use((req: express.Request, res: express.Response, next) => {
    res.status(404);

    if (req.accepts('html')) {
      res.send('404');
      return;
    }

    res.type('txt').send('Not found');
  })

  const logger = injector.get(LOGGER_TOKEN);
  router.use((err, req, res, next) => {
    logger.error("Catch express middleware error", {error: err})

    if (err instanceof AccessDenyError) {
      res.status(403);

      if (req.accepts('html')) {
        res.send('');
      } else {
        res.send('')
      }
    } else if (err instanceof BadRequestError) {
      res.sendStatus(400);
    } else if (err instanceof ResourceNotFoundError) {
      res.status(404);

      if (req.accepts('html')) {
        res.send('');
      } else {
        res.send('')
      }
    } else {
      logger.error("Catch express middleware error", {error: err})
      /*if (err.statusCode !== 'ERR_HTTP_HEADERS_SENT') {
        res.status(502);
        res.send(render('502', {supportTelegram: config.supportTelegram}))
      }*/
    }
  })

  return router;
}
