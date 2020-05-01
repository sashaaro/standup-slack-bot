import bodyParser from 'body-parser'
import express from 'express'
import session from 'express-session'
import createRedisConnectStore from 'connect-redis';
import {Injector} from "injection-js";
import {StandUpsAction} from "./controller/standUps";
import {SettingsAction} from "./controller/settings";
import {SyncAction} from "./controller/sync";
import {UpdateChannelAction} from "./controller/UpdateChannelAction";
import {Connection} from "typeorm";
import SyncLocker from "../services/SyncServcie";
import DashboardContext from "../services/DashboardContext";
import {CONFIG_TOKEN, REDIS_TOKEN, RENDER_TOKEN} from "../services/token";
import {OauthAuthorize} from "./controller/oauth-authorize";
import {RenderEngine} from "../services/RenderEngine";
import http from "http";
import { Redis } from 'ioredis';


const RedisConnectStore = createRedisConnectStore(session);

export const useBodyParserAndSession = (app: express.Express | express.Router, client: Redis) => {
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(session({
    secret: 'e7d3kd9-standup-slack-bot-session',
    resave: true,
    saveUninitialized: true,
    store: new RedisConnectStore({client}),
    //cookie: { secure: true }
  }))
}

export const useStaticPublicFolder = (app: express.Express) => {
  app.use(express.static('./resources/public'));
}

const locale = 'en';
const intl = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'long' });

export const createDashboardContext = (injector: Injector) => {
  const connection = injector.get(Connection)
  const syncService = injector.get(SyncLocker)
  const renderEngine = injector.get(RenderEngine)
  const config = injector.get(CONFIG_TOKEN)

  return async (req: http.IncomingMessage | express.Request | express.Router | any, res, next) => {
    const context = new DashboardContext(req.session, connection);
    await context.init();
    req.context = context;

    renderEngine.globalParams = {
      debug: config.debug,
      user: context.user,
      channel: context.channel,
      syncInProgress: context.user ? syncService.inProgress('update-slack-' + context.user.team.id) : false,
      intl
    }

    next()
  }
}

export class AccessDenyError extends Error {
}

export class ResourceNotFoundError extends Error {
}


const scopes = [
  'team:read',
  'channels:read',
  'chat:write',
  'users:read',
  'users:write',
  'groups:read',
  'im:read',
  'im:write',
  'im:history',
  'pins:write',
  'reactions:read',
  //'reactions:write',
]; //, 'im:history'

export const dashboardExpressMiddleware = (injector: Injector) => {
  const router = express.Router()
  useBodyParserAndSession(router, injector.get(REDIS_TOKEN));
  router.use(createDashboardContext(injector));

  const config = injector.get(CONFIG_TOKEN)
  const authLink = `https://slack.com/oauth/v2/authorize?client_id=${config.slackClientID}&scope=${scopes.join(',')}&redirect_uri=${config.host}/auth`


  router.get('/', async (req, res) => {
    const context = req['context'] as DashboardContext
    if (context.user) {
      return await injector.get(StandUpsAction).handle(req, res)
    } else {
      res.send(injector.get(RENDER_TOKEN)('welcome', {authLink}));
    }
  });

  const oauthAuthorize = injector.get(OauthAuthorize)
  router.get('/auth', oauthAuthorize.handle.bind(oauthAuthorize));

  router.get('/logout', (req, res) => {
    const session = req.session as any;
    session.destroy()
    res.redirect('/');
  });

  const settingAction = injector.get(SettingsAction)
  router.all('/settings', settingAction.handle.bind(settingAction));

  const syncAction = injector.get(SyncAction)
  router.get('/sync', syncAction.handle.bind(syncAction));

  const setChannelAction = injector.get(UpdateChannelAction)
  router.post('/channel/selected', setChannelAction.handle.bind(setChannelAction));


  router.use((req: express.Request, res: express.Response, next) => {
    res.status(404);

    if (req.accepts('html')) {
      res.send(injector.get(RENDER_TOKEN)('404'));
      return;
    }

    res.type('txt').send('Not found');
  })


  router.use((err, req, res, next) => {
    if (err instanceof AccessDenyError) {
      res.status(403);

      if (req.accepts('html')) {
        res.send(injector.get(RENDER_TOKEN)('403'));
      } else {
        res.send("")
      }
    } else if (err instanceof ResourceNotFoundError) {
      res.status(404);

      if (req.accepts('html')) {
        res.send(injector.get(RENDER_TOKEN)('404'));
      } else {
        res.send("")
      }
    } else {
      console.log(err)
    }
  })


  //const channelsAction = Container.get(ChannelsAction)
  //app.get('/channels', channelsAction.handle.bind(channelsAction));

  //const updateChannelAction = Container.get(UpdateChannelAction)
  //app.post('/channel', updateChannelAction.handle.bind(updateChannelAction));

  return router;
}
