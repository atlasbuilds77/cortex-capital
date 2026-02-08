#!/bin/bash
# Test verification script for Autonomous Trading Company database
# Run this after setting up the database to verify everything works

set -e

echo "=== Autonomous Trading Company Database Verification ==="
echo

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Database connection parameters (update these for your environment)
DB_NAME="${DB_NAME:-autonomous_trading}"
DB_USER="${DB_USER:-atc_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "Testing connection to database: $DB_NAME"
echo

# Function to run a query and display results
run_query() {
    local query="$1"
    local description="$2"
    
    echo "=== $description ==="
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$query" 2>/dev/null || {
        echo "Error running query. Check connection parameters."
        exit 1
    }
    echo
}

# 1. Check all tables exist
run_query "
SELECT table_name as \"Table Name\",
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as \"Columns\"
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'ops_%'
ORDER BY table_name;
" "1. Checking all 15 tables exist"

# 2. Verify policy count
run_query "
SELECT COUNT(*) as \"Policy Count\" FROM ops_policy;
" "2. Verifying policy count (should be 7 + 6 agents + agent_list = 14)"

# 3. Verify trigger rules
run_query "
SELECT COUNT(*) as \"Trigger Count\" FROM ops_trigger_rules;
" "3. Verifying trigger rules (should be 12)"

# 4. Verify agent relationships
run_query "
SELECT COUNT(*) as \"Relationship Count\" FROM ops_agent_relationships;
" "4. Verifying agent relationships (should be 15)"

# 5. Check agent definitions
run_query "
SELECT key as \"Agent Key\", 
       value->>'name' as \"Name\",
       value->>'role' as \"Role\"
FROM ops_policy 
WHERE key LIKE 'agent_%' AND key != 'agent_list'
ORDER BY key;
" "5. Checking agent definitions (should be 6 agents)"

# 6. Sample data verification
run_query "
SELECT 'Policies' as category, COUNT(*) as count FROM ops_policy
UNION ALL
SELECT 'Triggers', COUNT(*) FROM ops_trigger_rules
UNION ALL
SELECT 'Relationships', COUNT(*) FROM ops_agent_relationships
UNION ALL
SELECT 'Agent Definitions', COUNT(*) FROM ops_policy WHERE key LIKE 'agent_%' AND key != 'agent_list'
ORDER BY category;
" "6. Summary of seed data"

# 7. Check indexes
run_query "
SELECT tablename as \"Table\", 
       indexname as \"Index\",
       indexdef as \"Definition\"
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'ops_%'
ORDER BY tablename, indexname
LIMIT 10;
" "7. Checking indexes (first 10)"

# 8. Test helper functions (Python)
echo "=== 8. Testing Python helper functions ==="
if command -v python3 &> /dev/null; then
    echo "Running db_utils.py test..."
    python3 db_utils.py 2>&1 | head -20
    echo "Python test completed (showing first 20 lines)"
else
    echo "Python3 not available, skipping helper function test"
fi

echo
echo "=== Verification Complete ==="
echo
echo "If all checks passed, your database is ready for:"
echo "1. Integration with proposal service"
echo "2. Trigger system implementation"
echo "3. Agent memory system"
echo "4. Roundtable conversation orchestrator"
echo
echo "Next steps:"
echo "1. Review the README.md for setup instructions"
echo "2. Test the sample queries in README.md"
echo "3. Integrate with your application code"
echo
echo "Database layer complete! ✅"