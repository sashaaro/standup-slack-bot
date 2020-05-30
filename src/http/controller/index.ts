import {Request, Response} from "express";
import {ChannelsAction} from "./channels";
import {SyncAction} from "./sync";
import {OauthAuthorize} from "./oauth-authorize";
import {TeamController} from "./TeamController";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  (req: Request, res: Response): void
}


const actions = [
  OauthAuthorize,
  ChannelsAction,
  TeamController,
  SyncAction
];

export default actions;
