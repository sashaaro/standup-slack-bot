import 'express-async-errors';
import pino from "pino";
import {em, emStorage} from "../services/providers";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {stringifyError} from "../services/utils";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "./api.middleware";
import {AsyncLocalStorage} from "async_hooks";
import {User} from "../entity";
import {Handler, ErrorRequestHandler, Request, Response, NextFunction} from "express";
import {v4 as uuidv4} from "uuid";

export const errorHandler = (dumpError: boolean, logger: pino.Logger): ErrorRequestHandler => (err, req, res, next) => {
  if (err instanceof AccessDenyError) {
    res.status(403).send(); // check if not sent yet
  } else if (err instanceof BadRequestError) {
    res.status(400).send();
  } else if (err instanceof ResourceNotFoundError) {
    res.status(404).send();
    logger.debug(err, "404")
    // } else if (err instanceof ConnectionException) { // mysql disconnect..
    //  // try reconnect multi retry with delay
  } else {
    logger.error(err, "Catch express middleware error")
    if (err.statusCode !== 'ERR_HTTP_HEADERS_SENT' && !res.headersSent) {
      res.status(502).send(dumpError ? stringifyError(err) : '');
    }
  }
}

export const emMiddleware = (orm: MikroORM<PostgreSqlDriver>): Handler => (req, res, next: any) => {
  const em = orm.em.fork({
    clear: true,
    useContext: true
  });
  //em.execute(`set application_name to "Standup Bot Server Request ${req.method}: ${req.path}";`).catch(err => {
  //})
  emStorage.run(em, next)

  // res.on('finish', () => {
  //   em.getConnection().close();
  // })
}


export function createAsyncLocalStorageMiddleware<T>(storage: AsyncLocalStorage<T>|any, valueFactory: (req: Request, res: Response) => Promise<T>): Handler {
  return (req, res, next) => {
    valueFactory(req, res).then(value => {
      storage.run(value, next)
    }).catch(error => {
      next(error)
    })
  }
}

const requestContentStorage = new AsyncLocalStorage<{
  requestId: string,
  user?: User
}>();
export const reqContext = () => requestContentStorage.getStore()

const requestIdHeader = 'X-Request-ID';
export const requestContextMiddleware = createAsyncLocalStorageMiddleware(requestContentStorage, async (req, res) => {
  const requestId = req.headers[requestIdHeader] || uuidv4();
  res.setHeader(requestIdHeader, requestId);
  return {
    requestId
  }
})

export const authenticate = (user: User, req?) => {
  requestContentStorage.enterWith({
    ...requestContentStorage.getStore(),
    user: user
  });
  if (req) {
    req.session['user_id'] = user.id;
  }
}

export const apiContextMiddleware = (log: pino.Logger): Handler => async (req, res, next) => {
  const userID = req.session['user_id'];
  let user: User;

  // const err = new ContextualError('shit happends 2', {deep: 2})
  // err.previous = new ContextualError('shit happens 1', {deep: 1})
  // log.error({err, dd: 1}, 'shit msg')
  // log.error(err, 'shit msg')

  if (userID && typeof userID === "string") {
    user = await em()
      .createQueryBuilder(User, 'u')
      .select('*')
      .where({id: userID})
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