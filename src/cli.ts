import "reflect-metadata";
import {ReflectiveInjector} from 'injection-js';
import {logError} from "./services/logError";
import {createProvider, IAppConfig} from "./services/providers";

import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {CONFIG_TOKEN} from "./services/token";
import * as fs from 'fs';

const options: ConnectionOptions = {
  type: "postgres",
  host: "postgres",
  port: 5432,
  username: "postgres",
  password: "postgres",
  database: "postgres"
} // TODO from config


const run = async () => {
  if (process.argv.includes('db')) {
    const injector = ReflectiveInjector.resolveAndCreate(await createProvider('cli'))
    const config: IAppConfig = injector.get(CONFIG_TOKEN)
    const db = config.db;

    console.log('Init db')

    const connection = await createConnection(options);
    const isDatabaseExist = ((await connection.query(`SELECT datname FROM pg_database WHERE datname = '${db.database}' LIMIT 1`)) as any[]).length === 1;
    if (!isDatabaseExist) {
      await connection.query(`CREATE DATABASE ${db.database}`);

      console.log(`Database ${db.database} was created`);
    }

    const isUserExist = ((await connection.query(`SELECT 1 FROM pg_roles WHERE rolname='${db.username}' LIMIT 1`)) as any[]).length === 1;
    if (!isUserExist) {
      await connection.query(`CREATE USER ${db.username} WITH PASSWORD '${db.password}'`);
      await connection.query(`GRANT ALL PRIVILEGES ON DATABASE ${db.database} TO ${db.username}`);

      console.log(`User ${db.username} was created`);
    }
  }

  if (process.argv.includes('fixtures')) {
    const injector = ReflectiveInjector.resolveAndCreate(await createProvider())
    const connection: Connection = injector.get(Connection)

    await connection.query(fs.readFileSync('fixtures/timezone.sql').toString())
    console.log(`Timezone was uploaded`);
  }

  console.log(`Done`);

  return;
}

run().then(() => {

}).catch(error => {
  logError(error)
  throw error;
});