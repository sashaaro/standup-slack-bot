import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN} from "../../services/token";
import {IAppConfig} from "../../services/providers";
import {Request, Response} from "express";
import {bind} from "../../decorator/bind";
import {authorized} from "../../decorator/authorized";

@Injectable()
export class OptionController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig
  ) {
  }

  @bind
  @authorized
  async history(req: Request, res: Response) {
    const question = req.query.questionId
    const options = {} // TODO mikroorm
    //   await this.connection.getRepository(QuestionOption).find({
    //   question: {id: question},
    // });

    res.setHeader('Content-Type', 'application/json');
    res.send(options);
  }
}
