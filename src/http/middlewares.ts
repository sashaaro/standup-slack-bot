import 'express-async-errors';
import {Logger} from "pino";
import {em, emStorage} from "../services/providers";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {stringifyError} from "../services/utils";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "./api.middleware";
import {AsyncLocalStorage} from "async_hooks";
import {User} from "../entity";
import {Handler, ErrorRequestHandler} from "express";

export const errorHandler = (dumpError: boolean, logger: Logger): ErrorRequestHandler => (err, req, res, next) => {
  if (err instanceof AccessDenyError) {
    res.status(403).send(); // check if not sent yet
  } else if (err instanceof BadRequestError) {
    res.status(400).send();
  } else if (err instanceof ResourceNotFoundError) {
    res.status(404).send();
    // } else if (err instanceof ConnectionException) { // mysql disconnect..
    //  // try reconnect multi retry with delay
  } else {
    logger.error(err, "Catch express middleware error")
    if (err.statusCode !== 'ERR_HTTP_HEADERS_SENT') {
      res.status(502).send(dumpError ? stringifyError(err) : '');
    }
  }
}

export const emMiddleware = (mikro: MikroORM<PostgreSqlDriver>): Handler => (req, res, next) => {
  const em = mikro.em.fork(true, true);
  em.execute(`set application_name to "Standup Bot Server Request ${req.method}: ${req.path}";`)
  emStorage.run(em, next)

  // res.on('finish', () => {
  //   em.getConnection().close();
  // })
}


export function createAsyncLocalStorageMiddleware<T>(storage: AsyncLocalStorage<T>, valueFactory: (req, res) => Promise<T>): Handler {
  return (req, res, next) => {
    valueFactory(req, res).then(value => {
      storage.run(value, next)
    }).catch(error => {
      next(error)
    })
  }
}

const requestContentStorage = new AsyncLocalStorage<{
  hash: string,
  user?: User
}>();
export const reqContext = () => requestContentStorage.getStore()

export const requestContextMiddleware = createAsyncLocalStorageMiddleware(requestContentStorage, async () => await ({
  hash: new Date().getTime() + '_' + Math.random().toString().substr(-15)
}))


export interface IAuthUser {
  id: string,
  scope?: string,
  access_token?: string,
  token_type?: string
}

export const authenticate = (user: User, req?, authedUser?: IAuthUser) => {
  requestContentStorage.enterWith({
    ...requestContentStorage.getStore(),
    user: user
  });
  if (req) {
    req.session.user = authedUser; // TODO save id only?
  }
}

export const apiContextMiddleware = (log: Logger): Handler => async (req, res, next) => {
  const authedUser: IAuthUser = req.session['user'];
  let user: User;
  if (authedUser) {
    if (typeof authedUser.id !== "string") {
      log.warn(authedUser, 'Invalid authed user')
      return null
    }
    user = await em()
      .createQueryBuilder(User, 'u')
      .select('*')
      .where({id: authedUser.id})
      .leftJoinAndSelect('u.workspace', 'w')
      .getSingleResult()

    if (user) {
      authenticate(user);
    }
  }

  log.debug({user: user ? {
    id: user.id,
    name: user.name
  } : null}, 'Auth user')

  next()
}