import * as yargs from "yargs";
import {initFixtures} from "../services/providers";
import {Injectable} from "injection-js";
import {bind} from "../services/decorators";

@Injectable()
export class DatabaseFixtureCommand implements yargs.CommandModule {
  static meta = {
    command: 'database:fixture',
    describe: 'Load database fixture',
  }

  constructor() {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    // TODO mikroorm
    // if (!this.connection.isConnected) {
    //   await this.connection.connect();
    // }
    // await initFixtures(this.connection)
    // this.connection.close()
  }
}
