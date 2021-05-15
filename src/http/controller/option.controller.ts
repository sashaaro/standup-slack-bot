import { Injectable, Inject } from 'injection-js';
import {Request, Response} from "express";
import {bind} from "../../decorator/bind";
import {authorized} from "../../decorator/authorized";

@Injectable()
export class OptionController {
  @bind
  @authorized
  async history(req: Request, res: Response) {
    const question = req.query.questionId
    const options = {}
    //   await this.connection.getRepository(QuestionOption).find({
    //   question: {id: question},
    // });

    res.setHeader('Content-Type', 'application/json');
    res.send(options);
  }
}
