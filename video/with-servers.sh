#!/usr/bin/env bash
# Usage: bash with-servers.sh <command...>
# Starts frontend + backend, waits for readiness, runs the command, tears down.
# Servers must live within this process tree because the sandbox reaps
# background processes between commands.
set -uo pipefail
cd "$(dirname "$0")/.."

npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!

(cd backend && cargo run --release > /tmp/backend.log 2>&1) &
BACKEND_PID=$!

cleanup() {
  kill "$VITE_PID" 2>/dev/null || true
  kill "$BACKEND_PID" 2>/dev/null || true
  pkill -P "$VITE_PID" 2>/dev/null || true
  pkill -f "target/release" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
}
trap cleanup EXIT

READY=0
for i in $(seq 1 90); do
  V=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:5173 2>/dev/null || echo 000)
  B=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8080/health 2>/dev/null || echo 000)
  if [ "$V" = "200" ] && [ "$B" = "200" ]; then
    echo "servers ready (waited ${i}s)"
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" != "1" ]; then
  echo "servers failed to start: vite=$V backend=$B"
  tail -n 5 /tmp/vite.log
  tail -n 5 /tmp/backend.log
  exit 1
fi

"$@"
