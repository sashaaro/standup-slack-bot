import {Request, Response} from "express";
import {AuthController} from "./auth.controller.";
import {TeamController} from "./team.controller";
import {UsersController} from "./users.controller";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  (req: Request, res: Response): void
}


const actions = [
  AuthController,
  TeamController,
  UsersController
];

export default actions;
