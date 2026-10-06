#!/usr/bin/env bash
# Dev loop: rebuild, restart the prod server on :3100, then screenshot. Usage: scripts/cycle.sh [tier] [w] [h]
set -e
cd "$(dirname "$0")/.."
PID=$(netstat -ano | grep ":3100 " | grep LISTENING | awk '{print $5}' | head -1)
[ -n "$PID" ] && taskkill //PID "$PID" //F >/dev/null 2>&1 || true
npx next build > reports/build.log 2>&1 || { tail -30 reports/build.log; exit 1; }
(npx next start -p 3100 > reports/server.log 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null localhost:3100 && break; sleep 1; done
npx tsx scripts/shoot.mts "${1:-high}" "${2:-1440}" "${3:-900}"
