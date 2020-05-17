# syntax=docker/dockerfile:experimental
FROM node:12.16.3-alpine AS builder

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm install

COPY ./ .

RUN ./node_modules/.bin/tsc

FROM node:12.16.3-alpine

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm install --production
RUN rm -rf ~/.npm/*
COPY --from=builder /opt/app/dist ./dist

COPY ./cli.sh .
# USER worker

ENTRYPOINT ["./cli.sh"]
