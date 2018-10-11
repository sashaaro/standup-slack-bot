##Standup slack bot

Setup

    docker run --rm -p 27017:27017 mongo:3.4.6
    docker run -it --rm -v "$(PWD)/":/project node:8.6.0-alpine node /project/server/index.js
    docker run --rm -it -v ${PWD}:/project node:8.12.0-alpine sh