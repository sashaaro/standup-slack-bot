import "reflect-metadata";
import {ReflectiveInjector} from 'injection-js';
import {logError} from "./services/logError";
import {createProviders, IAppConfig, initFixtures} from "./services/providers";

import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {CONFIG_TOKEN, IWorkerFactory, WORKER_FACTORY_TOKEN} from "./services/token";
import * as fs from 'fs';
import {SlackTransport} from "./slack/SlackTransport";

const run = async () => {
  const envParam = process.argv.filter((param) => param.startsWith(`--env=`)).pop();
  let env = 'local';
  if (envParam) {
    env = envParam.split('=')[1]
  }

  const injector = ReflectiveInjector.resolveAndCreate(createProviders(env))

  const connection = await injector.get(Connection) as Connection;
  await connection.connect();

  console.log('Environment: ' + env)
  if (process.argv.includes('db')) {
    console.log('Init db')

    const config: IAppConfig = injector.get(CONFIG_TOKEN)
    const db = config.db;

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

    if (process.argv.includes('migrate')) {
      console.log(`Migrate...`);

      const migrations = await connection.runMigrations();
      migrations.map(m => m.name).map(console.log)
    }
  }

  if (process.argv.includes('fixtures')) {
    await initFixtures(connection)
    console.log(`Timezone was uploaded`);
  }

  if (process.argv.includes('worker')) {
    console.log(`Worker`);

    const slackTransport = injector.get(SlackTransport) as SlackTransport
    const workerFactory = injector.get(WORKER_FACTORY_TOKEN) as IWorkerFactory;
    const worker = workerFactory('main', async (job) => {
      const result = await slackTransport.handelJob(job)

      //job.name
      //job.data
      console.log(result)
      // TODO
    });

    worker.on('process', (job) => {
      console.log(`${job.id} has process!`);
    });

    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
      console.log(`${job.id} has failed with ${err.message}`);
    });

    //worker.listeners()
  }

  console.log(`Done`);
}

run().then(() => {
}).catch(error => {
  logError(error)
  throw error;
});
// process.exit(1);
