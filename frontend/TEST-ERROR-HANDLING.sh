#!/bin/bash
# Quick verification that all error handling files exist

echo "🔍 Verifying error handling implementation..."
echo ""

files=(
  "components/ui/error-boundary.tsx"
  "components/ui/empty-state.tsx"
  "components/ui/loading-states.tsx"
  "components/ui/toast.tsx"
  "components/ui/offline-banner.tsx"
  "app/error.tsx"
  "app/not-found.tsx"
  "lib/api.ts"
  "ERROR-HANDLING-SUMMARY.md"
  "ERROR-HANDLING-CHECKLIST.md"
  "INTEGRATION-GUIDE.md"
  "components/ui/README.md"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - MISSING"
    missing=$((missing + 1))
  fi
done

echo ""
echo "📊 Summary:"
echo "  Total files: ${#files[@]}"
echo "  Missing: $missing"

if [ $missing -eq 0 ]; then
  echo ""
  echo "✨ All error handling files are in place!"
  echo ""
  echo "📋 Next steps:"
  echo "  1. Read ERROR-HANDLING-CHECKLIST.md"
  echo "  2. Add ToastProvider to app/layout.tsx"
  echo "  3. Add loading skeletons to dashboard"
  echo "  4. Test with: npm run dev"
  echo ""
  echo "⚡ 15 minutes to production-ready error handling!"
else
  echo ""
  echo "⚠️  Some files are missing. Check implementation."
fi
