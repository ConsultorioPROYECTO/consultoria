#!/bin/bash
pm2 delete all
git pull --rebase
npm i
npm run build
pm2 start npm --name "consultoria-web-app" -- run start

