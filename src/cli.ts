#!/usr/bin/env node
import "reflect-metadata";
import yargs from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createProviders} from "./services/providers";
import {commands} from "./command";
import {CONFIG_TOKEN, LOGGER_TOKEN, TERMINATE} from "./services/token";
import Rollbar from "rollbar";

let argv = yargs.option('env', {
  default: 'dev',
  describe: 'Environment'
})

const env = argv.argv.env;
const injector = ReflectiveInjector.resolveAndCreate(createProviders(env))

const config = injector.get(CONFIG_TOKEN);
const logger = injector.get(LOGGER_TOKEN);
console.log(`Environment: ${env}. Debug: ${config.debug ? 'enable' : 'disable'}`);

injector.get(TERMINATE).subscribe(() => {
  console.log('Terminate...')
})


if (config.rollBarAccessToken) {
  const rollbar = new Rollbar({
    accessToken: config.rollBarAccessToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: process.env.APP_CONTEXT || undefined
  });
}

// config.redisLazyConnect = !argv.argv._.includes('queue:consume')

let main = yargs
  .usage("Usage: $0 <command> [options]")

commands.forEach(command => {
  const commandInstance = injector.get(command) as yargs.CommandModule
  const originHandler = commandInstance.handler;
  commandInstance.handler = (...args) => {
    return originHandler.call(commandInstance, ...args)
  };
  main = main.command(commandInstance);
})

try {
  main
    .demandCommand(1)
    .strict()
    .argv
} catch (e) {
  logger.error('Application error', {error: e});
}

