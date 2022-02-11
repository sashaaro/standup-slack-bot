import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {WorkerCommand} from "./WorkerCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {ServerCommand} from "./server.command";
import {MigrationGenerateCommand} from "./MigrationGenerateCommand";
import {SyncSlackCommand} from "./SyncSlackCommand";
import {DevCommand} from "./DevCommand";

export const dbCommands: any = [
  //MigrationGenerateCommand,
  //DatabaseMigrateCommand,
  //DatabaseFixtureCommand,
]

export const commands: any = [
  WorkerCommand,
  StandupNotifyCommand,
  ServerCommand,
  ...dbCommands,
  SyncSlackCommand
];


export const devCommands: any = [
  DevCommand
]