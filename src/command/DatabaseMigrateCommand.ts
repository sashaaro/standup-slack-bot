import * as yargs from "yargs";
import {createProviders} from "../services/providers";
import {ReflectiveInjector} from "injection-js";
import {Connection} from "typeorm";

export class DatabaseMigrateCommand implements yargs.CommandModule {
  command = 'database:migrate';
  describe = 'Migrate database';

  async handler(args: yargs.Arguments<{}>) {
    const injector = ReflectiveInjector.resolveAndCreate(createProviders(args.env as any))

    const connection = await injector.get(Connection) as Connection;
    await connection.connect();

    const migrations = await connection.runMigrations();
    migrations.map(m => m.name).map(console.log)
  }
}
