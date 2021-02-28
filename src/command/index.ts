import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {ServerCommand} from "./ServerCommand";
import {MigrationGenerateCommand} from "./MigrationGenerateCommand";
import {SyncSlackCommand} from "./SyncSlackCommand";
import {DevCommand} from "./DevCommand";

export const dbCommands: any = [
  MigrationGenerateCommand,
  DatabaseMigrateCommand,
  DatabaseFixtureCommand,
]

export const commands: any = [
  QueueConsumeCommand,
  StandupNotifyCommand,
  ServerCommand,
  ...dbCommands,
  SyncSlackCommand
];


export const devCommands: any = [
  DevCommand
]