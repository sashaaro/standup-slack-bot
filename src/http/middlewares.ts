import express from 'express'
import 'express-async-errors';
import getRawBody from "raw-body";
import {Logger} from "winston";

export const createLoggerMiddleware = (logger: Logger) => (req: express.Request, res: express.Response, next) => {
  (req.originalUrl.startsWith('/api/slack') && req.method === "POST" ? getRawBody(req) : Promise.resolve(null)).then(buff => {
    logger.debug('Request', {
      url: req.originalUrl,
      method: req.method,
      body: buff?.toString(),
      headers: JSON.stringify(req.headers)
    })
  })

  res.on('finish', () => {
    logger.debug(`Response ${res.get('Content-Length') || 0}b sent`, {
      status: res.statusCode,
      method: req.method,
    })
  })

  next()
}

