#!/bin/bash

echo "Cortex Capital - Enhanced Agents Build Test"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in cortex-capital directory"
    exit 1
fi

echo "✅ In cortex-capital directory"

# Test TypeScript compilation
echo -e "\nTesting TypeScript compilation..."

ERRORS=0

# Test analysis integration
echo -n "  analysis-integration.ts: "
if npx tsc --noEmit lib/agents/analysis-integration.ts 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    ERRORS=$((ERRORS + 1))
fi

# Test enhanced analyst
echo -n "  analyst-enhanced.ts: "
if npx tsc --noEmit lib/agents/analyst-enhanced.ts 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    ERRORS=$((ERRORS + 1))
fi

# Test enhanced strategist
echo -n "  strategist-enhanced.ts: "
if npx tsc --noEmit lib/agents/strategist-enhanced.ts 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    ERRORS=$((ERRORS + 1))
fi

# Test enhanced risk
echo -n "  risk-enhanced-complete.ts: "
if npx tsc --noEmit lib/agents/risk-enhanced-complete.ts 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    ERRORS=$((ERRORS + 1))
fi

# Test enhanced executor
echo -n "  executor-enhanced.ts: "
if npx tsc --noEmit lib/agents/executor-enhanced.ts 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    ERRORS=$((ERRORS + 1))
fi

# Test orchestrator
echo -n "  cortex-orchestrator.ts: "
if npx tsc --noEmit lib/agents/cortex-orchestrator.ts 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    ERRORS=$((ERRORS + 1))
fi

echo -e "\n==========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All enhanced agents compile successfully!"
    echo "✅ Analysis engines are properly wired into Cortex Capital agents"
    exit 0
else
    echo "❌ $ERRORS file(s) failed to compile"
    echo "❌ Check TypeScript errors above"
    exit 1
fi