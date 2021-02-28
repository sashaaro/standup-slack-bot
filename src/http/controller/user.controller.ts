import { Injectable } from 'injection-js';
import {Connection} from "typeorm";
import User from "../../model/User";
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";

@Injectable()
export class UserController {
  constructor(private connection: Connection) {}

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const users = await this.connection.getRepository(User).find({
      workspace: req.context.user.workspace
    })

    res.setHeader('Content-Type', 'application/json');
    res.send(users);
  }
}
