import "reflect-metadata";
import {createConnection} from "typeorm";
import Question from "./model/Question";
import Team from "./model/Team";
import User from "./model/User";

//const slackClient = require('@slack/client')
import * as slackClient from '@slack/client'
import * as express from 'express'
import * as bodyParser from 'body-parser'


const app = express()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', async (req, res) => {

    res.send('hi');
    /*res.send(pug.compileFile('templates/index.pug')({
        authLink: authLink
    }))*/
})

app.listen(3000);

createConnection({
    driver: {
        type: "postgres",
        //host: "localhost",
        host: "172.17.0.1",
        port: 5432,
        username: "default",
        password: "secret",
        database: "standup"
    },
    entities: [
        Question,
        Team,
        User,
    ],
    autoSchemaSync: true,
}).then(async connection => {
    const n = await connection.getRepository(Question)
        .createQueryBuilder("q")
        .getCount()

    let team = new Team();
    team.settings = {key: 'value11'};
    const user = new User;
    user.name = 'Иван';
    team.users = [user];

    team = await connection.entityManager.persist(team)

    console.log(team);
    // here you can start to work with your entities
}).catch(error => console.log(error));