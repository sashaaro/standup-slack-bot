import * as bodyParser from 'body-parser'
import * as express from 'express'
import * as session from 'express-session'
import * as createRedisConnectStore from 'connect-redis';
import {Injector} from "injection-js";
import {AuthAction} from "./controller/auth";
import {StandUpsAction} from "./controller/standUps";
import {SettingsAction} from "./controller/settings";
import {SyncAction} from "./controller/sync";
import {SetChannelAction} from "./controller/setChannel";
import {Connection} from "typeorm";
import SyncService from "../services/SyncServcie";
import AuthorizationContext from "../services/AuthorizationContext";
import {CONFIG_TOKEN} from "../services/token";

const RedisConnectStore = createRedisConnectStore(session);

export const useBodyParserAndSession = (app: express.Express | express.Router) => {
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    store: new RedisConnectStore({host: 'redis'}),
    //cookie: { secure: true }
  }))
}

export const useStaticPublicFolder = (app: express.Express) => {
  app.use(express.static('./resources/public'));
}


export const dashboardContext = (injector: Injector) => {
  const connection = injector.get(Connection)
  const syncService = injector.get(SyncService)
  const config = injector.get(CONFIG_TOKEN)

  return (req: express.Request | express.Router | any, res, next) => {
    req.context = new AuthorizationContext(req, connection, syncService, config);

    next()
  }
}

export const dashboardExpressMiddleware = (injector: Injector) => {
  const router = express.Router()
  router.use(dashboardContext(injector));

  router.get('/', (req, res) => {
    const session = req.session;
    const user = session.user;

    if (!user) {
      res.redirect('/auth');
      return;
    }

    const standUpsAction = injector.get(StandUpsAction)
    return standUpsAction.handle(req, res)
  });

  const authAction = injector.get(AuthAction)

  router.get('/auth', authAction.handle.bind(authAction));
  router.get('/logout', (req, res) => {
    const session = req.session as any;
    session.destroy()
    res.redirect('/auth');
  });

  const settingAction = injector.get(SettingsAction)
  router.all('/settings', settingAction.handle.bind(settingAction));

  const syncAction = injector.get(SyncAction)
  router.get('/sync', syncAction.handle.bind(syncAction));

  const setChannelAction = injector.get(SetChannelAction)
  router.post('/channel/selected', setChannelAction.handle.bind(setChannelAction));

  //const channelsAction = Container.get(ChannelsAction)
  //app.get('/channels', channelsAction.handle.bind(channelsAction));

  //const updateChannelAction = Container.get(UpdateChannelAction)
  //app.post('/channel', updateChannelAction.handle.bind(updateChannelAction));

  return router;
}
