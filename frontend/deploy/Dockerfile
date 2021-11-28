# syntax=docker/dockerfile:experimental
FROM node:16.13-alpine AS builder

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./
RUN npm install

COPY ./src src
COPY ./*.json ./
RUN ./node_modules/@angular/cli/bin/ng build --prod

FROM nginx:1.19.10-alpine
WORKDIR /opt/app
COPY ./deploy/default-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /opt/app/dist/frontend ./dist
