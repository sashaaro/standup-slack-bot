import * as yargs from "yargs";
import {Inject, Injectable} from "injection-js";
import {MIKRO_TOKEN} from "../services/token";
import {bind} from "../decorator/bind";
import {initMikroORM} from "../services/utils";

@Injectable()
export class MigrationGenerateCommand implements yargs.CommandModule {
  static meta = {
    command: 'migration:generate',
    describe: "Generates a new migration file with sql needs to be executed to update schema.",
    aliases: 'migrations:generate',
  }

  constructor(@Inject(MIKRO_TOKEN) private orm) {}

  @bind
  async handler(args: yargs.Arguments) {
    await initMikroORM(this.orm)

    await this.orm.getMigrator().createMigration()
    await this.orm.close()
  }
}
