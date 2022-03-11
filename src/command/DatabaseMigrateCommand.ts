import * as yargs from "yargs";
import {Inject, Injectable} from "injection-js";
import {MIKRO_TOKEN} from "../services/token";
import {bind} from "../decorator/bind";
import {initMikroORM} from "../services/utils";

@Injectable()
export class DatabaseMigrateCommand implements yargs.CommandModule {
  command = 'database:migrate'
  describe = 'Migrate database'

  constructor(@Inject(MIKRO_TOKEN) private orm) {}

  @bind
  async handler(args: yargs.Arguments) {
    await initMikroORM(this.orm)

    await this.orm.getMigrator().up()
    await this.orm.close()
  }
}
