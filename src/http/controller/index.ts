import {Request, Response} from "express";
import {AuthController} from "./auth.controller.";
import {TeamController} from "./team.controller";
import {UserController} from "./user.controller";
import {ChannelController} from "./channel.controller";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  (req: Request, res: Response): void
}


const actions = [
  AuthController,
  TeamController,
  UserController,
  ChannelController
];

export default actions;
