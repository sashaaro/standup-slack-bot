import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {ServerCommand} from "./ServerCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {bind} from "../services/decorators";
import {MIKRO_TOKEN} from "../services/token";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";

export class DevCommand implements yargs.CommandModule {
  static meta = {
    command: 'dev',
    describe: 'Combine server:run standup:notify queue:consume for watcher'
  }

  constructor(
    @Inject(Injector) private injector: Injector,
    @Inject(MIKRO_TOKEN) private mikroORM,
  ) {
  }

  @bind
  async handler(args: yargs.Arguments<{}>) {

    let mikroORM: MikroORM<PostgreSqlDriver>;
    mikroORM = await this.mikroORM

    if (!await mikroORM.isConnected()) {
      await mikroORM.connect()
      await mikroORM.em.execute('set application_name to "Standup Bot Dev";');
    }

    const commands = [
      ServerCommand,
      StandupNotifyCommand,
      // QueueConsumeCommand
    ]

    for (const command of commands) {
      const cmd = this.injector.get(command) as yargs.CommandModule
      cmd.handler(args)
    }
  }

  private test() {
    // const ems = []
    // for (const q of [1,2,3,4,5]) {
    //   await sleep(2000)
    //   const em = await mikroORM.em.fork(true, false)
    //   em.begin();
    //   console.log(await em.execute('SELECT * from pg_stat_activity where pid = pg_backend_pid();'))
    //   console.log(em.id)
    //   //em.commit();
    //   ems.push(em);
    // }
    //
    // for (const em of ems) {
    //   await sleep(300)
    //   await em.commit()
    //   em.getConnection().close()
    // }
  }
}
