#!/bin/bash
pm2 delete all
git pull --rebase
npm i
rm -rf package-lock.json
npm run build
pm2 start npm --name "consultoria-web-app" -- run start

