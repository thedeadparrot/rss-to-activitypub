FROM node:18

RUN apt-get update && apt-get install -y beanstalkd python3 cron
WORKDIR /app
COPY package*.json ./
RUN npm install -g node-gyp && npm install

COPY . .
RUN chown node:node /app

ADD crontab /etc/cron.d/schedule-feed-update

RUN chmod 0644 /etc/cron.d/schedule-feed-update
RUN crontab -u node /etc/cron.d/schedule-feed-update


EXPOSE ${PORT}

CMD [ "./startup.sh" ]
