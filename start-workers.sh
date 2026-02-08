#!/bin/bash
# Start all Cortex Capital workers

# Load environment variables
export DATABASE_URL="postgresql://postgres.lbwbgbujgribraeluzuv:k0Yb2ESDIksIKTS2@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

# Create logs directory if it doesn't exist
mkdir -p logs

# Kill existing workers
pkill -f "crypto-worker" || true
pkill -f "options-worker" || true
pkill -f "futures-worker" || true
pkill -f "twitter-worker" || true

echo "Starting all workers..."

# Start crypto worker
nohup node node_modules/.bin/ts-node workers/crypto-worker/index.ts > logs/crypto-worker.log 2>&1 &
echo "Crypto worker started: $!"

# Start options worker
nohup node node_modules/.bin/ts-node workers/options-worker/index.ts > logs/options-worker.log 2>&1 &
echo "Options worker started: $!"

# Start futures worker
nohup node node_modules/.bin/ts-node workers/futures-worker/index.ts > logs/futures-worker.log 2>&1 &
echo "Futures worker started: $!"

# Start twitter worker
nohup node node_modules/.bin/ts-node workers/twitter-worker/index.ts > logs/twitter-worker.log 2>&1 &
echo "Twitter worker started: $!"

echo ""
echo "All workers started. Check logs in ./logs/"
echo ""
echo "To view logs:"
echo "  tail -f logs/crypto-worker.log"
echo "  tail -f logs/options-worker.log"
echo "  tail -f logs/futures-worker.log"
echo "  tail -f logs/twitter-worker.log"
echo ""
echo "To check status:"
echo "  ps aux | grep worker | grep -v grep"
