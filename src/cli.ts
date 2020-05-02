#!/usr/bin/env node
import "reflect-metadata";
import * as yargs from "yargs";
import {DatabaseCreateCommand} from "./command/DatabaseCreateCommand";
import {DatabaseMigrateCommand} from "./command/DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./command/DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./command/QueueConsumeCommand";


yargs
  .usage("Usage: $0 <command> [options]")
  .option('env', {
    default: 'dev',
    describe: 'Environment'
  })
  .command(new DatabaseCreateCommand())
  .command(new DatabaseMigrateCommand())
  .command(new DatabaseFixtureCommand())
  .command(new QueueConsumeCommand())
  .demandCommand(1)
  .strict()
  .argv
