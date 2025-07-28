#!/bin/bash

echo "🔍 Testing Collaboration Database Fix"
echo "===================================="
echo ""

# Test 1: Check if collaboration_events table exists in main database
echo "✅ Test 1: Checking collaboration_events table exists..."
PGPASSWORD=syncsphere_password psql -h localhost -p 5432 -U syncsphere -d syncsphere -c "SELECT COUNT(*) as event_count FROM collaboration_events;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS: collaboration_events table exists and is accessible!"
else
    echo "❌ FAILED: collaboration_events table not accessible"
fi

echo ""

# Test 2: Check all required tables exist
echo "✅ Test 2: Checking all collaboration tables exist..."
PGPASSWORD=syncsphere_password psql -h localhost -p 5432 -U syncsphere -d syncsphere -c "
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN 'All collaboration tables exist!' 
        ELSE 'Missing tables: ' || (4 - COUNT(*))::text 
    END as status
FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('collaboration_events', 'studio_projects', 'timeline_elements', 'tracks');
" 2>/dev/null

echo ""

# Test 3: Test if we can insert a test collaboration event
echo "✅ Test 3: Testing collaboration event insertion..."
PGPASSWORD=syncsphere_password psql -h localhost -p 5432 -U syncsphere -d syncsphere -c "
INSERT INTO collaboration_events (project_id, user_id, type, payload) 
VALUES ('test-project', 'test-user', 'TEST_EVENT', '{\"message\": \"Database fix test\"}');
SELECT 'Test event inserted successfully!' as result;
" 2>/dev/null

echo ""

# Test 4: Check existing database tables to ensure nothing was broken
echo "✅ Test 4: Verifying existing SynxSphere tables are intact..."
PGPASSWORD=syncsphere_password psql -h localhost -p 5432 -U syncsphere -d syncsphere -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name NOT IN ('collaboration_events', 'studio_projects', 'timeline_elements', 'tracks')
ORDER BY table_name LIMIT 5;
" 2>/dev/null

echo ""
echo "🎉 Database Fix Verification Complete!"
echo ""
echo "Expected Results:"
echo "• ✅ No more 'relation collaboration_events does not exist' errors"
echo "• ✅ WebSocket collaboration server should work"
echo "• ✅ StudioService integration should be improved"
echo "• ✅ Real-time collaboration features should function"
