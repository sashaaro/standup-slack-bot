import 'express-async-errors';
import {Logger} from "pino";
import {emStorage} from "../services/providers";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {stringifyError} from "../services/utils";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "./api.middleware";

export const errorHandler = (dumpError: boolean, logger: Logger) => (err, req, res, next) => {
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

export const emMiddleware = (mikro: MikroORM<PostgreSqlDriver>) => (req, res, next) => {
  const em = mikro.em.fork(true, true);
  em.execute(`set application_name to "Standup Bot Server Request ${req.method}: ${req.path}";`)
  emStorage.run(em, next)

  // res.on('finish', () => {
  //   em.getConnection().close();
  // })
}

