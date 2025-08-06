#!/bin/bash
pm2 delete all
git pull --rebase
pnpm i
rm -rf package-lock.json
pnpm run build
pm2 start pnpm --name "consultoria-web-app" -- run start

