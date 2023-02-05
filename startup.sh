#!/bin/bash

service cron start
service beanstalkd start

su node
npm run start
