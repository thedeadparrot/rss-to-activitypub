FROM node:18

RUN apt-get update && apt-get install -y beanstalkd python3 && \
    service beanstalkd start

WORKDIR /app
COPY package*.json ./
RUN npm install -g node-gyp && npm install

COPY . .
RUN chown node:node /app

COPY config.json.template /config/config.json.template

EXPOSE ${PORT}

USER node
CMD [ "npm", "run", "start" ]
