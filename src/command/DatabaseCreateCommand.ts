import * as yargs from "yargs";
import {createProviders, IAppConfig} from "../services/providers";
import {ReflectiveInjector} from "injection-js";
import {Connection} from "typeorm";
import {CONFIG_TOKEN} from "../services/token";

export class DatabaseCreateCommand implements yargs.CommandModule {
  command = 'database:create';
  describe = 'Create database';

  async handler(args: yargs.Arguments<{}>) {
    const injector = ReflectiveInjector.resolveAndCreate(createProviders(args.env as any))

    const connection = await injector.get(Connection) as Connection;
    await connection.connect();

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
  }
}
