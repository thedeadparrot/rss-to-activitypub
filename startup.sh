#!/bin/bash

service cron start
service beanstalkd start

su node
# Run feed updater in the background.
npm run consume &
npm run start
