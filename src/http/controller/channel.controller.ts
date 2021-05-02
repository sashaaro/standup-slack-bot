import { Injectable, Inject } from 'injection-js';
import {em} from "../../services/providers";
import {Request, Response} from "express";
import {Channel} from "../../entity";
import {serialize} from "class-transformer";
import {bind} from "../../decorator/bind";
import {authorized} from "../../decorator/authorized";
import {reqContext} from "../middlewares";

@Injectable()
export class ChannelController {
  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const channels = await em().find(Channel, { // TODO find without relations
      workspace: reqContext().user.workspace,
      isEnabled: true,
      isArchived: false
    });

    res.setHeader('Content-Type', 'application/json')
    res.send(serialize(channels));
  }
}
