import { Injectable } from 'injection-js';
import {Request, Response} from "express";
import {em} from "../../services/providers";
import {User} from "../../entity";
import {bind} from "../../decorator/bind";
import {authorized} from "../../decorator/authorized";
import {reqContext} from "../middlewares";

@Injectable()
export class UserController {
  constructor() {}

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const users: User[] = await em().find(User, {workspace: reqContext().user.workspace})

    res.setHeader('Content-Type', 'application/json');
    users.forEach(u => {
      delete u.accessToken
      delete u.workspace.accessToken
    })
    res.send(users);
  }
}
