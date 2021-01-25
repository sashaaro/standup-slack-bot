import * as yargs from "yargs";
import {initFixtures} from "../services/providers";
import {Connection} from "typeorm";
import {Injectable} from "injection-js";
import {bind} from "../services/utils";

@Injectable()
export class DatabaseFixtureCommand implements yargs.CommandModule {
  command = 'database:fixture';
  describe = 'Load database fixture';

  constructor(private connection: Connection) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    await this.connection.connect();

    await initFixtures(this.connection)
    this.connection.close()
  }
}
