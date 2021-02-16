import * as yargs from "yargs";
import {Connection} from "typeorm";
import {Injectable} from "injection-js";
import {bind} from "../services/utils";

@Injectable()
export class DatabaseMigrateCommand implements yargs.CommandModule {
  command = 'database:migrate';
  describe = 'Migrate database';

  constructor(private connection: Connection) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    if (!this.connection.isConnected) {
      await this.connection.connect();
    }
    const migrations = await this.connection.runMigrations();
    migrations.forEach(m => {
      console.log(m.instance);
    });

    await this.connection.close();
  }
}
