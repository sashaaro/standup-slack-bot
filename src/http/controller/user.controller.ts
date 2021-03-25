import { Injectable } from 'injection-js';
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";

@Injectable()
export class UserController {
  constructor() {}

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const users = [];
      // TOOD mikroorm
    //   await this.connection.getRepository(User).find({
    //   workspace: req.context.user.workspace
    // })

    res.setHeader('Content-Type', 'application/json');
    res.send(users);
  }
}
