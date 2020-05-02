import * as yargs from "yargs";
import {Connection} from "typeorm";
import {Injectable} from "injection-js";

@Injectable()
export class DatabaseMigrateCommand implements yargs.CommandModule {
  command = 'database:migrate';
  describe = 'Migrate database';

  constructor(private connection: Connection) {}

  async handler(args: yargs.Arguments<{}>) {
    await this.connection.connect();

    const migrations = await this.connection.runMigrations();
    migrations.map(m => m.name).map(console.log)
  }
}
