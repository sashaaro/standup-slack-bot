#!/usr/bin/env node
import "reflect-metadata";
import yargs from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createConfFromEnv, createLogger, createProviders} from "./services/providers";
import {MIKRO_CONFIG_TOKEN, MIKRO_TOKEN, TERMINATE, TERMINATE_HANDLER} from "./services/token";
import Rollbar from "rollbar";
import pino from "pino";
import fs from "fs";
import dotenv from "dotenv";
import {CLIConfigurator} from "@mikro-orm/cli";
import {hideBin} from "yargs/helpers";
import {initMikroORM} from "./services/utils";


// const env = yargs.option('env', {
//   default: 'dev',
//   describe: 'Environment'
// }).argv.env;

const env = 'dev';

if (fs.existsSync(`.env.${env}`)) {
  dotenv.config({path: `.env.${env}`})
}
const config = createConfFromEnv(env);
const logger: pino.Logger = createLogger(config);

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

const {providers, commands} = createProviders(config, logger);
// consider https://github.com/TypedProject/tsed/tree/production/packages/di
const injector = ReflectiveInjector.resolveAndCreate([...providers, ...commands]);

logger.info({env, debug: config.debug}, `Start`)

injector.get(TERMINATE).subscribe(_ => {
  injector.get(TERMINATE_HANDLER)()
  logger.info('Terminate...')
})

if (config.rollBarAccessToken) {
  const rollbar = new Rollbar({
    accessToken: config.rollBarAccessToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: env//process.argv.join(' ')
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