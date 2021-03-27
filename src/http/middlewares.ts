import express from 'express'
import 'express-async-errors';
import getRawBody from "raw-body";
import {Logger} from "pino";

export const createLoggerMiddleware = (logger: Logger) => (req: express.Request, res: express.Response, next) => {
  (req.originalUrl.startsWith('/api/slack') && req.method === "POST" ? getRawBody(req) : Promise.resolve(null)).then(buff => {
    logger.debug({
      url: req.originalUrl,
      method: req.method,
      body: buff?.toString(),
      headers: JSON.stringify(req.headers)
    }, 'Request')
  })

  res.on('finish', () => {
    logger.debug({
      status: res.statusCode,
      method: req.method,
    }, `Response ${res.get('Content-Length') || 0}b sent`)
  })

  next()
}

