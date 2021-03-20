import {Request, Response} from "express";
import {AuthController} from "./auth.controller";
import {TeamController} from "./team.controller";
import {UserController} from "./user.controller";
import {ChannelController} from "./channel.controller";
import {StandupController} from "./standup.controllert";
import {OptionController} from "./option.controller";
import {StatController} from "./stat.controller";

export interface IHttpAction {
  (req: Request, res: Response): void
}

const actions = [
  AuthController,
  TeamController,
  UserController,
  ChannelController,
  StandupController,
  OptionController,
  StatController
];

export default actions;
