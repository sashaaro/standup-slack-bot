# syntax=docker/dockerfile:experimental
FROM node:12.17.0-alpine AS builder

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./

RUN npm install

COPY ./ .

RUN npm run build

FROM node:12.16.3-alpine

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./
RUN npm install --production
RUN rm -rf ~/.npm/*
COPY --from=builder /opt/app/dist ./dist
COPY --from=builder /opt/app/resources ./resources
COPY ./cli.sh .
COPY ./.env* ./
# USER worker

ENTRYPOINT ["./cli.sh"]
