import * as yargs from "yargs";
import {Inject, Injectable} from "injection-js";
import {MIKRO_TOKEN} from "../services/token";
import fs from "fs";
import {bind} from "../decorator/bind";
import {initMikroORM} from "../services/utils";

@Injectable()
export class DatabaseFixtureCommand implements yargs.CommandModule {
  command = 'database:fixture'
  describe = 'Load database fixture'

  constructor(
    @Inject(MIKRO_TOKEN) private orm,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    await initMikroORM(this.orm)

    this.orm.em.execute(this.sql())
    await this.orm.close()
  }

  private sql() {
    return fs.readFileSync('resources/timezone.sql').toString()
  }
}
