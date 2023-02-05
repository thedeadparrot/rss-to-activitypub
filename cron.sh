#!/bin/bash

export PATH=$PATH:/usr/local/bin

cd "$(dirname "$0")";
node ./queueFeeds.js
