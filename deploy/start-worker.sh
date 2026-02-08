#!/bin/sh
set -e

echo "Starting worker: $WORKER_TYPE"

case $WORKER_TYPE in
  crypto)
    exec npx ts-node workers/crypto-worker/index.ts
    ;;
  options)
    exec npx ts-node workers/options-worker/index.ts
    ;;
  futures)
    exec npx ts-node workers/futures-worker/index.ts
    ;;
  roundtable)
    exec npx ts-node roundtable/roundtable-worker/index.ts
    ;;
  *)
    echo "Unknown worker type: $WORKER_TYPE"
    exit 1
    ;;
esac
