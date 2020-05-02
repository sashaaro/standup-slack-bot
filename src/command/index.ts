import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {ServerCommand} from "./ServerCommand";

export const commands = [
  DatabaseMigrateCommand,
  DatabaseFixtureCommand,
  QueueConsumeCommand,
  StandupNotifyCommand,
  ServerCommand
];
