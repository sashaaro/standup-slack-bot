import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {ServerCommand} from "./ServerCommand";
import {MigrationGenerateCommand} from "./MigrationGenerateCommand";
import * as yargs from "yargs";
import {SyncSlackCommand} from "./SyncSlackCommand";

export const commands: any = [
  DatabaseMigrateCommand,
  DatabaseFixtureCommand,
  QueueConsumeCommand,
  StandupNotifyCommand,
  ServerCommand,
  MigrationGenerateCommand,
  SyncSlackCommand
];
