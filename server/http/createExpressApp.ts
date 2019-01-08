import * as bodyParser from 'body-parser'
import * as express from 'express'
import * as session from 'express-session'
import * as createRedisConnectStore from 'connect-redis';
import {Container} from "typedi";
import {AuthAction} from "./controller/auth";
import {StandUpsAction} from "./controller/standUps";
import {SettingsAction} from "./controller/settings";
import {SyncAction} from "./controller/sync";
import {SetChannelAction} from "./controller/setChannel";
import {ChannelsAction} from "./controller/channels";
import {UpdateChannelAction} from "./controller/updateChannel";

const RedisConnectStore = createRedisConnectStore(session);

export const createExpressApp = () => {
  const app = express()
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    store: new RedisConnectStore({host: 'redis'})
    //cookie: { secure: true }
  }))

  app.use(express.static('./resources/public'));

  app.get('/', (req, res) => {
    const session = req.session;
    const user = session.user;

    if (!user) {
      res.redirect('/auth');
      return;
    }

    const standUpsAction = Container.get(StandUpsAction)
    return standUpsAction.handle(req, res)
  });

  const authAction = Container.get(AuthAction)

  app.get('/auth', authAction.handle.bind(authAction));
  app.get('/logout', (req, res) => {
    const session = req.session as any;
    session.destroy()
    res.redirect('/auth');
    return;
  });

  const settingAction = Container.get(SettingsAction)
  app.all('/settings', settingAction.handle.bind(settingAction));

  const syncAction = Container.get(SyncAction)
  app.get('/sync', syncAction.handle.bind(syncAction));

  const setChannelAction = Container.get(SetChannelAction)
  app.post('/channel/selected', setChannelAction.handle.bind(setChannelAction));

  //const channelsAction = Container.get(ChannelsAction)
  //app.get('/channels', channelsAction.handle.bind(channelsAction));

  //const updateChannelAction = Container.get(UpdateChannelAction)
  //app.post('/channel', updateChannelAction.handle.bind(updateChannelAction));


  return app;
}
