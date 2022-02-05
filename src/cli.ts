#!/usr/bin/env node
import "reflect-metadata";
import yargs, {Arguments} from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createConfFromEnv, createLogger, createProviders} from "./services/providers";
import {TERMINATE} from "./services/token";
import Rollbar from "rollbar";
import pino from "pino";
import fs from "fs";
import dotenv from "dotenv";

const argv = yargs.option('env', {
  default: 'dev',
  describe: 'Environment'
})

const env = (argv.argv as any).env;

if (fs.existsSync(`.env.${env}`)) {
  dotenv.config({path: `.env.${env}`})
}
const config = createConfFromEnv(env);
const logger: pino.Logger = createLogger(config);

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
const injector = ReflectiveInjector.resolveAndCreate(providers);

logger.info({env, debug: config.debug}, `Start`)

injector.get(TERMINATE).subscribe(() => {
  logger.info('Terminate...')
})

if (config.rollBarAccessToken) {
  const rollbar = new Rollbar({
    accessToken: config.rollBarAccessToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: process.argv.join(' ')
  });
}

let main = yargs
  .usage("Usage: $0 <command> [options]")

commands.forEach((command: any) => {
  const meta = command.meta as Partial<yargs.CommandModule<any, any>>
  const handler: (args: Arguments<any>) => void = async (args) => {
      await injector.get(command).handler(args)
  }
  main = main.command({...meta, handler});
})


main
  .strict()
  .fail(e => logger.fatal(e, 'Application fail'))
  .argv