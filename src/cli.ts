#!/usr/bin/env node
import "reflect-metadata";
import yargs from "yargs";
import {MIKRO_CONFIG_TOKEN, MIKRO_TOKEN, TERMINATE, TERMINATE_HANDLER} from "./services/token";
import Rollbar from "rollbar";
import {CLIConfigurator} from "@mikro-orm/cli";
import {hideBin} from "yargs/helpers";
import {initMikroORM} from "./services/utils";
import {config, injector, logger} from "./services";
import {commands} from "./command";

const argv: yargs.Argv = yargs(hideBin(process.argv))
  .scriptName('standup-bot')
  .usage('$0 <cmd> [args]')
  .fail((msg, err) => {
    if (err) {
      logger.fatal(err, 'Application fail')
    } else {
      logger.warn(msg)
    }
    injector.get(TERMINATE_HANDLER)()
  })

// argv
//   .onFinishCommand(e => {
//     injector.get(TERMINATE_HANDLER)()
//   })


// https://getpino.io/#/docs/help?id=exit-logging
// process.on('uncaughtException', pino.final(logger, (err, finalLogger) => {
//   finalLogger.error(err, 'uncaughtException')
//   process.exit(1)
// }))
//
// process.on('unhandledRejection', pino.final(logger, (err, finalLogger) => {
//   finalLogger.error(err, 'unhandledRejection')
//   process.exit(1)
// }))

// consider https://github.com/TypedProject/tsed/tree/production/packages/di

logger.info({env: config.env, debug: config.debug}, `Start`)

injector.get(TERMINATE).subscribe(_ => {
  injector.get(TERMINATE_HANDLER)()
  logger.info('Terminate...')
})

if (config.rollBarAccessToken) {
  const rollbar = new Rollbar({
    accessToken: config.rollBarAccessToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: config.env//process.argv.join(' ')
  });
}

// const ormCommands: any[] = [
//   ...CLIConfigurator.createOrmCommands(() => {
//       return new Promise((resolve, reject) => {
//         const mikro = injector.get(MIKRO_TOKEN)
//           initMikroORM(mikro)
//             .then(_ => {
//               resolve(mikro)
//             })
//             .catch(er => reject(er))
//       })
//   }),
//   ...CLIConfigurator.createConfigCommands(() => injector.get(MIKRO_CONFIG_TOKEN))
// ]

commands.forEach(cmd => {
  argv.command(injector.get(cmd))
})
// ormCommands.forEach(cmd => argv.command(cmd))

argv
  //.strict()
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .argv
