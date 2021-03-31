import * as yargs from "yargs";
import {Inject, Injectable} from "injection-js";
import {MIKRO_TOKEN} from "../services/token";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {bind} from "../decorator/bind";

@Injectable()
export class DatabaseMigrateCommand implements yargs.CommandModule {
  static meta = {
    command: 'database:migrate',
    describe: 'Migrate database',
  }

  constructor(@Inject(MIKRO_TOKEN) private mikroORM) {}

  @bind
  async handler(args: yargs.Arguments) {
    let mikroORM: MikroORM<PostgreSqlDriver>;
    mikroORM = await this.mikroORM

    if (!await mikroORM.isConnected()) {
      await mikroORM.connect()
    }

    await mikroORM.getMigrator().up()
    await mikroORM.close()
  }
}
