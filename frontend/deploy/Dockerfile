# syntax=docker/dockerfile:experimental
FROM node:14.15.0-alpine AS builder

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./
RUN npm install

COPY ./src src
COPY ./*.json ./
RUN ./node_modules/@angular/cli/bin/ng build --prod

FROM nginx:1.18.0-alpine
WORKDIR /opt/app
COPY ./deploy/default-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /opt/app/dist/frontend ./dist
