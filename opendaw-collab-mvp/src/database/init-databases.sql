-- Create the default user database to prevent connection errors
-- This prevents errors when applications try to connect without specifying a database name
CREATE DATABASE IF NOT EXISTS opendaw OWNER opendaw;
