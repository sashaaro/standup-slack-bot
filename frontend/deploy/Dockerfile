# syntax=docker/dockerfile:experimental
FROM node:14.15.0-alpine AS builder

WORKDIR /opt/app

COPY ./package.json ./package-lock.json ./
RUN npm install --production

COPY ./ .
RUN ./node_modules/@angular/cli/bin ng build --prod

FROM nginx:1.18.0-alpine
WORKDIR /opt/app
COPY ./default-nginx.conf /etc/nginx/sites-enabled/default
COPY --from=builder /opt/app/dist ./dist
