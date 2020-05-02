import {DatabaseCreateCommand} from "./DatabaseCreateCommand";
import {DatabaseMigrateCommand} from "./DatabaseMigrateCommand";
import {DatabaseFixtureCommand} from "./DatabaseFixtureCommand";
import {QueueConsumeCommand} from "./QueueConsumeCommand";
import {StandupNotifyCommand} from "./StandupNotifyCommand";

export const commands = [
  DatabaseCreateCommand,
  DatabaseMigrateCommand,
  DatabaseFixtureCommand,
  QueueConsumeCommand,
  StandupNotifyCommand
];
