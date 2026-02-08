#!/bin/bash
# Quick script to run Shannon security audit on Cortex Capital

set -e

echo "🔐 SHANNON SECURITY AUDIT - CORTEX CAPITAL"
echo "=========================================="
echo ""

# Check if Shannon is set up
if [ ! -d "/Users/atlasbuilds/clawd/shannon" ]; then
  echo "❌ Shannon not found. Please clone it first:"
  echo "git clone https://github.com/KeygraphHQ/shannon.git /Users/atlasbuilds/clawd/shannon"
  exit 1
fi

# Check for API key
if [ ! -f "/Users/atlasbuilds/clawd/shannon/.env" ]; then
  echo "⚠️  No .env file found in Shannon directory"
  echo "Creating one now. Please add your ANTHROPIC_API_KEY:"
  echo ""
  cat > /Users/atlasbuilds/clawd/shannon/.env << 'EOF'
ANTHROPIC_API_KEY=your_key_here
CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000
EOF
  echo "✅ Created /Users/atlasbuilds/clawd/shannon/.env"
  echo "📝 Edit it with your Anthropic API key, then re-run this script"
  exit 1
fi

echo "✅ Shannon found"
echo "✅ Config ready"
echo ""

# Ask user what to audit
echo "What do you want to audit?"
echo "1) Live dashboard (requires npm run dev)"
echo "2) Codebase only (static analysis)"
echo ""
read -p "Choice (1 or 2): " choice

cd /Users/atlasbuilds/clawd/shannon

if [ "$choice" = "1" ]; then
  echo ""
  echo "🚀 Starting audit of LIVE dashboard..."
  echo ""
  echo "Make sure dashboard is running:"
  echo "  cd dashboard && npm run dev"
  echo ""
  read -p "Press Enter when dashboard is running..."
  
  ./shannon start \
    URL=http://host.docker.internal:3000 \
    REPO=/Users/atlasbuilds/clawd/autonomous-trading-company \
    CONFIG=./configs/cortex-capital-config.yaml \
    OUTPUT=./audit-logs/cortex-capital-live
  
else
  echo ""
  echo "🚀 Starting STATIC code analysis..."
  echo ""
  
  ./shannon start \
    URL=http://localhost:3000 \
    REPO=/Users/atlasbuilds/clawd/autonomous-trading-company \
    CONFIG=./configs/cortex-capital-config.yaml \
    OUTPUT=./audit-logs/cortex-capital-static
fi

echo ""
echo "✅ Shannon audit started!"
echo ""
echo "Monitor progress:"
echo "  cd /Users/atlasbuilds/clawd/shannon"
echo "  ./shannon logs"
echo ""
echo "Or open Temporal UI:"
echo "  open http://localhost:8233"
echo ""
echo "Expected time: 1-1.5 hours"
echo "Expected cost: ~$50 (Anthropic API)"
echo ""
echo "Report will be saved to:"
echo "  shannon/audit-logs/cortex-capital-*/deliverables/comprehensive_security_assessment_report.md"
