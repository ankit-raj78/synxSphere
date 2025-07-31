-- Create the default user database to prevent connection errors
-- This prevents errors when applications try to connect without specifying a database name
-- Note: PostgreSQL doesn't support IF NOT EXISTS for CREATE DATABASE
-- This file is kept for reference but the actual creation is handled in 02-init-additional-dbs.sh

-- CREATE DATABASE opendaw OWNER opendaw;
-- (This is handled in the shell script to avoid syntax errors)
