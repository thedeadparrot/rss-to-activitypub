FROM node:18

RUN apt-get update && apt-get install -y beanstalkd python3 && \
    service beanstalkd start

WORKDIR /app
COPY package*.json ./
RUN npm install -g node-gyp && npm ci

COPY . .
RUN chown node:node /app

EXPOSE ${PORT}

USER node
CMD [ "npm", "run", "start" ]