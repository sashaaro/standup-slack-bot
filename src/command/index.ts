import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./queue-consume.command";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {ServerCommand} from "./server.command";
import {MigrationGenerateCommand} from "./MigrationGenerateCommand";
import {SyncSlackCommand} from "./SyncSlackCommand";
import {DevCommand} from "./dev.command";

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