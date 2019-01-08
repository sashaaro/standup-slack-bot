import {Request, Response} from "express";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  handle(req: Request, res: Response)
}

