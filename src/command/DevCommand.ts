import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {ServerCommand} from "./ServerCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {MIKRO_TOKEN} from "../services/token";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {sleep} from "../services/utils";
import {bind} from "../decorator/bind";

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

    //this.deadlock(mikroORM);
  }

  private async deadlock(mikroORM: MikroORM<PostgreSqlDriver>) {
    const workspace = Math.random().toString().substr(-6, 6)
    const workspace2 = Math.random().toString().substr(-6, 6)
    await mikroORM.em.execute(`INSERT INTO slack_workspace VALUES (
 '${workspace}',
 'workspace-${workspace}',
 'origin domain', '{}', 'token-${workspace}');`)

    await mikroORM.em.execute(`INSERT INTO slack_workspace VALUES (
 '${workspace2}',
 'workspace-${workspace2}',
 'origin domain', '{}', 'token-${workspace2}');`)

    const aliceCon = (await mikroORM.em.fork(true, true))
    const bobCon = (await mikroORM.em.fork(true, true))

    await aliceCon.begin();
    await bobCon.begin();

    // https://postgrespro.ru/docs/postgresql/9.6/transaction-iso
    //let isolationLevel = 'READ UNCOMMITTED';
    let isolationLevel = 'READ COMMITTED';
    isolationLevel = 'REPEATABLE READ';
    //isolationLevel = 'SERIALIZABLE';

    await aliceCon.execute('SET TRANSACTION ISOLATION LEVEL ' + isolationLevel);
    await bobCon.execute('SET TRANSACTION ISOLATION LEVEL ' + isolationLevel);

    await aliceCon.execute(`SELECT * FROM slack_workspace where id = '${workspace}' FOR UPDATE`)
    await aliceCon.execute(`UPDATE slack_workspace SET
 domain = 'alice domain'
 where id = '${workspace}'`)
    console.log('[Alice] update domain')

    await bobCon.execute(`UPDATE slack_workspace SET domain = 'bob domain' where id = '${workspace2}'`)
    console.log(`[Bob] updated no alice domain`)

    // https://postgrespro.ru/docs/postgresql/9.6/explicit-locking#row-lock-compatibility
    await bobCon.execute(`SELECT * FROM slack_workspace where id = '${workspace}' FOR UPDATE`)
    const result = await bobCon.execute(`SELECT * FROM slack_workspace where id = '${workspace}'`)
    console.log(`[Bob] does not see alice changes yet (uncommited). See ${result[0].domain}`)

    console.log('[Bob] try update domain but waiting alice commit... lock');
    // https://postgrespro.ru/docs/postgresql/10/monitoring-stats
    // bob wait_event_type = Lock
    bobCon.execute(`UPDATE slack_workspace SET domain = 'bob domain' where id = '${workspace}'`).then(async result => {
      console.log('[Bob] rewrited domain');
      await bobCon.commit();
    })

    // TODO SELECT * FROM pg_locks;

    await (async () => {
      await sleep(7000)
      await aliceCon.commit();
      console.log('[Alice] committed');
    })()
  }
}
