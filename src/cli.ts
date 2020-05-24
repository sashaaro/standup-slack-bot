#!/usr/bin/env node
import "reflect-metadata";
import yargs from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createProviders} from "./services/providers";
import {commands} from "./command";
import {CONFIG_TOKEN, LOGGER_TOKEN, TERMINATE} from "./services/token";

let argv = yargs.option('env', {
  default: 'dev',
  describe: 'Environment'
})

const env = argv.argv.env;
const injector = ReflectiveInjector.resolveAndCreate(createProviders(env))

injector.get(LOGGER_TOKEN).debug(`Environment: ${env}`)

injector.get(TERMINATE).subscribe(() => {
  injector.get(LOGGER_TOKEN).debug('Terminate...')
})

let main = yargs
  .usage("Usage: $0 <command> [options]")

injector.get(CONFIG_TOKEN).redisLazyConnect = !argv.argv._.includes('queue:consume')

commands.forEach(command => {
  const commandInstance = injector.get(command) as yargs.CommandModule
  const originHandler = commandInstance.handler;
  commandInstance.handler = (...args) => {
    return originHandler.call(commandInstance, ...args)
  };
  main = main.command(commandInstance);
})

main
  .demandCommand(1)
  .strict()
  .argv

