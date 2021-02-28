#!/usr/bin/env node
import "reflect-metadata";
import yargs, {Arguments} from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createProviders} from "./services/providers";
import {CONFIG_TOKEN, LOGGER_TOKEN, TERMINATE} from "./services/token";
import Rollbar from "rollbar";
import "./services/decorators";

let argv = yargs.option('env', {
  default: 'dev',
  describe: 'Environment'
})

const env = argv.argv.env;
const {providers, commands} = createProviders(env);
// consider https://github.com/TypedProject/tsed/tree/production/packages/di
const injector = ReflectiveInjector.resolveAndCreate(providers);

const config = injector.get(CONFIG_TOKEN);
const logger = injector.get(LOGGER_TOKEN);
console.log(`Environment: ${env}. Debug: ${config.debug ? 'true' : 'false'}`);

injector.get(TERMINATE).subscribe(() => {
  console.log('Terminate...')
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
  const handler: (args: Arguments<any>) => void = (args) => injector.get(command).handler(args)
  main = main.command({...meta, handler});
})

try {
  main
    .strict()
    .argv
} catch (e) {
  logger.error('Application error', {error: e});
}

