import * as yargs from "yargs";
import {createProviders, initFixtures} from "../services/providers";
import {ReflectiveInjector} from "injection-js";
import {Connection} from "typeorm";

export class DatabaseFixtureCommand implements yargs.CommandModule {
  command = 'database:fixture';
  describe = 'Load database fixture';

  async handler(args: yargs.Arguments<{}>) {
    const injector = ReflectiveInjector.resolveAndCreate(createProviders(args.env as any))

    const connection = await injector.get(Connection) as Connection;
    await connection.connect();

    await initFixtures(connection)
  }
}
