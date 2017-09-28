import "reflect-metadata";
import {createConnection} from "typeorm";
import {Photo} from "./model/Photo";

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
        Photo
    ],
    autoSchemaSync: true,
}).then(connection => {
    // here you can start to work with your entities
}).catch(error => console.log(error));