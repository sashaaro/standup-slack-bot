import * as yargs from "yargs";
import {Inject, Injectable} from "injection-js";
import {bind} from "../services/decorators";
import {MIKRO_TOKEN} from "../services/token";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import fs from "fs";

@Injectable()
export class DatabaseFixtureCommand implements yargs.CommandModule {
  static meta = {
    command: 'database:fixture',
    describe: 'Load database fixture',
  }

  constructor(
    @Inject(MIKRO_TOKEN) private mikroORM,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    let mikroORM: MikroORM<PostgreSqlDriver>;
    mikroORM = await this.mikroORM

    if (!await mikroORM.isConnected()) {
      await mikroORM.connect()
    }

    mikroORM.em.execute(this.sql())
    await mikroORM.close()
  }

  private sql() {
    return fs.readFileSync('resources/timezone.sql').toString()
  }
}
