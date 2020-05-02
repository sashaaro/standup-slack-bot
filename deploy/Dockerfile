FROM  node:12.14.1-alpine

WORKDIR /opt/app

COPY ./package.json ./package-lock.json

RUN npm install
COPY ./ .

RUN ./node_modules/.bin/tsc

# USER worker

ENTRYPOINT "./cli.sh"
