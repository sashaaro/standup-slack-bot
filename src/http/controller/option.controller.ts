import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, LOGGER_TOKEN} from "../../services/token";
import {IAppConfig} from "../../services/providers";
import {Connection} from "typeorm";
import {Logger} from "winston";
import {Request, Response} from "express";
import QuestionOption from "../../model/QuestionOption";
import {authorized, bind} from "../../services/decorators";

@Injectable()
export class OptionController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private connection: Connection,
    @Inject(LOGGER_TOKEN) private logger: Logger,
  ) {
  }

  @bind
  @authorized
  async history(req: Request, res: Response) {
    const question = req.query.questionId
    const options = await this.connection.getRepository(QuestionOption).find({
      //question: {id: question},
    });

    res.setHeader('Content-Type', 'application/json');
    res.send(options);
  }
}
