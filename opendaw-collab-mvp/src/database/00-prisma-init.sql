-- 00-prisma-init.sql
-- This script applies the Prisma migration to create the core schema first
-- It must run before the collaboration tables are added

-- Apply the main Prisma migration
\i /docker-entrypoint-initdb.d/prisma-migration.sql

-- Apply the collaboration schema with functions and stored procedures
\i /docker-entrypoint-initdb.d/schema.sql
