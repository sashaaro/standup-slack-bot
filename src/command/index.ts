import {DatabaseCreateCommand} from "./DatabaseCreateCommand";
import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";
import {ServerCommand} from "./ServerCommand";

export const commands = [
  DatabaseCreateCommand,
  DatabaseMigrateCommand,
  DatabaseFixtureCommand,
  QueueConsumeCommand,
  StandupNotifyCommand,
  ServerCommand
];
