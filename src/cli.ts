#!/usr/bin/env node
import "reflect-metadata";
import yargs, {Arguments} from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createProviders} from "./services/providers";
import {CONFIG_TOKEN, LOG_TOKEN, TERMINATE} from "./services/token";
import Rollbar from "rollbar";
import pino, {Logger} from "pino";

const argv = yargs.option('env', {
  default: 'dev',
  describe: 'Environment'
})

const env = (argv.argv as any).env;

const {providers, commands} = createProviders(env);
// consider https://github.com/TypedProject/tsed/tree/production/packages/di
const injector = ReflectiveInjector.resolveAndCreate(providers);

const config = injector.get(CONFIG_TOKEN);
const logger: Logger = injector.get(LOG_TOKEN);

// https://getpino.io/#/docs/help?id=exit-logging
process.on('uncaughtException', pino.final(logger, (err, finalLogger) => {
  finalLogger.error(err, 'uncaughtException')
  process.exit(1)
}))

process.on('unhandledRejection', pino.final(logger, (err, finalLogger) => {
  finalLogger.error(err, 'unhandledRejection')
  process.exit(1)
}))

logger.info({env, debug: config.debug}, `Start `)

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