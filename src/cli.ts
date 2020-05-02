#!/usr/bin/env node
import "reflect-metadata";
import * as yargs from "yargs";
import {ReflectiveInjector} from "injection-js";
import {createProviders} from "./services/providers";
import {commands} from "./command";

let argv = yargs.option('env', {
  default: 'dev',
  describe: 'Environment'
})

const env = argv.argv.env;
console.log(`Environment: ${env}`)

const injector = ReflectiveInjector.resolveAndCreate(createProviders(env))

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

main
  .demandCommand(1)
  .strict()
  .argv
