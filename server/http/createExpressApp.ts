import * as bodyParser from 'body-parser'
import {Connection} from "typeorm";
import * as express from 'express'
import * as session from 'express-session'
import {HttpController} from "./controller";
import "./controller/dashboard";
import "./controller/main";
import "./controller/settings";
import {IAppConfig} from "../index_ts";
import * as createRedisConnectStore from 'connect-redis';

const RedisConnecStore = createRedisConnectStore(session);

const questionList = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
]

export const createExpressApp = (connection: Connection, config: IAppConfig) => {
    const app = express()
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(session({
        secret: 'keyboard cat',
        resave: true,
        saveUninitialized: true,
        store: new RedisConnecStore({host: 'redis'})
        //cookie: { secure: true }
    }))

    app.use(express.static('./resources/public'));

    const httpController = new HttpController(connection, config);

    app.get('/', httpController.mainAction.bind(httpController));
    app.get('/dashboard', httpController.dashboardAction.bind(httpController));

    app.route('/dashboard/settings')
        .get(httpController.settingsAction.bind(httpController))
        .post(httpController.postSettingsAction.bind(httpController));

    return app;
}
