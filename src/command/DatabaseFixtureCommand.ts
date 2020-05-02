import * as yargs from "yargs";
import {initFixtures} from "../services/providers";
import {Connection} from "typeorm";
import {Injectable} from "injection-js";

@Injectable()
export class DatabaseFixtureCommand implements yargs.CommandModule {
  command = 'database:fixture';
  describe = 'Load database fixture';

  constructor(private connection: Connection) {}

  async handler(args: yargs.Arguments<{}>) {
    await this.connection.connect();

    await initFixtures(this.connection)
  }
}
