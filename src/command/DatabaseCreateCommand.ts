import * as yargs from "yargs";
import {IAppConfig} from "../services/providers";
import {Inject} from "injection-js";
import {Connection} from "typeorm";
import {CONFIG_TOKEN} from "../services/token";

export class DatabaseCreateCommand implements yargs.CommandModule {
  command = 'database:create';
  describe = 'Create database';

  constructor(
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig
  ) {
  }


  async handler(args: yargs.Arguments<{}>) {
    await this.connection.connect();

    const db = this.config.db;

    const isDatabaseExist = ((await this.connection.query(`SELECT datname FROM pg_database WHERE datname = '${db.database}' LIMIT 1`)) as any[]).length === 1;
    if (!isDatabaseExist) {
      await this.connection.query(`CREATE DATABASE ${db.database}`);

      console.log(`Database ${db.database} was created`);
    }

    const isUserExist = ((await this.connection.query(`SELECT 1 FROM pg_roles WHERE rolname='${db.username}' LIMIT 1`)) as any[]).length === 1;
    if (!isUserExist) {
      await this.connection.query(`CREATE USER ${db.username} WITH PASSWORD '${db.password}'`);
      await this.connection.query(`GRANT ALL PRIVILEGES ON DATABASE ${db.database} TO ${db.username}`);

      console.log(`User ${db.username} was created`);
    }
  }
}
