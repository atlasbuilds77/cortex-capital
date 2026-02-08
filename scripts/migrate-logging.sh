#!/bin/bash
# Migrate console.log to structured logging
# Run this script to help convert remaining console.log statements

cd /Users/atlasbuilds/clawd/autonomous-trading-company

echo "Finding all console.log statements..."
grep -r "console\.log\|console\.error\|console\.warn" --include="*.ts" --include="*.tsx" . | wc -l

echo ""
echo "Files with console statements:"
grep -r "console\." --include="*.ts" --include="*.tsx" -l . | head -20

echo ""
echo "Top 5 files by console statement count:"
for file in $(grep -r "console\." --include="*.ts" --include="*.tsx" -l .); do
  count=$(grep -c "console\." "$file")
  echo "$count $file"
done | sort -rn | head -5

echo ""
echo "To replace manually:"
echo "1. Add import: import { logger } from '../utils/logger';"
echo "2. Create scoped logger: const log = logger.child('ModuleName');"
echo "3. Replace:"
echo "   console.log('message') → log.info('message')"
echo "   console.log('msg', var) → log.info('msg', { var })"
echo "   console.error('err') → log.error('err')"
echo "   console.warn('warn') → log.warn('warn')"
echo ""
echo "Priority files to update:"
echo "- integration/heartbeat.ts ✅ (partially done)"
echo "- workers/crypto-worker/index.ts ✅ (imports added)"
echo "- workers/options-worker/index.ts"
echo "- workers/futures-worker/index.ts"
echo "- core/proposal-service.ts"
echo "- core/policy-engine.ts"
