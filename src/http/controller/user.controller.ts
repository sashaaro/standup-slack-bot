import { Injectable } from 'injection-js';
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";
import {em} from "../../services/providers";
import {User} from "../../entity";

@Injectable()
export class UserController {
  constructor() {}

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const users = await em().find(User, {workspace: req.context.user.workspace})

    res.setHeader('Content-Type', 'application/json');
    res.send(users);
  }
}
