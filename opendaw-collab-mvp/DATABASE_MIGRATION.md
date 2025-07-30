# Database Migration: Update box_ownership Table

This migration updates the `box_ownership` table structure to support separate tracking of TrackBox and AudioUnitBox ownership.

## Changes

1. **Removed**: Generic `box_uuid` column
2. **Added**: 
   - `trackbox_uuid` - For tracking TrackBox ownership
   - `audiounitbox_uuid` - For tracking AudioUnitBox ownership
   - `room_id` - For associating ownership with specific rooms
3. **Constraint**: Only one of `trackbox_uuid` or `audiounitbox_uuid` can be set per row

## How to Apply Migration

### Option 1: Using psql command line

```bash
# Navigate to the project directory
cd opendaw-collab-mvp

# Run the migration script
psql -U opendaw_user -d opendaw_collab -f src/database/02-update-box-ownership.sql
```

### Option 2: Using pgAdmin or other PostgreSQL GUI

1. Open pgAdmin and connect to your `opendaw_collab` database
2. Open the Query Tool
3. Copy and paste the contents of `src/database/02-update-box-ownership.sql`
4. Execute the query

### Option 3: Manual execution

If you need to apply the migration manually, here are the SQL commands:

```sql
-- Step 1: Create new table with updated structure
CREATE TABLE IF NOT EXISTS box_ownership_new (
  project_id VARCHAR(255) NOT NULL,
  trackbox_uuid VARCHAR(255),
  audiounitbox_uuid VARCHAR(255),
  owner_id VARCHAR(255) NOT NULL,
  owned_at TIMESTAMP DEFAULT NOW(),
  -- Ensure at least one UUID is provided
  CONSTRAINT check_uuid_presence CHECK (
    (trackbox_uuid IS NOT NULL AND audiounitbox_uuid IS NULL) OR 
    (trackbox_uuid IS NULL AND audiounitbox_uuid IS NOT NULL)
  ),
  -- Composite primary key based on which UUID is present
  PRIMARY KEY (project_id, COALESCE(trackbox_uuid, audiounitbox_uuid))
);

-- Step 2: Migrate existing data (assuming current box_uuid refers to AudioUnitBox)
INSERT INTO box_ownership_new (project_id, audiounitbox_uuid, owner_id, owned_at)
SELECT project_id, box_uuid, owner_id, owned_at
FROM box_ownership;

-- Step 3: Drop old table
DROP TABLE IF EXISTS box_ownership;

-- Step 4: Rename new table
ALTER TABLE box_ownership_new RENAME TO box_ownership;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_owner ON box_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_trackbox ON box_ownership(trackbox_uuid) WHERE trackbox_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_box_ownership_audiounitbox ON box_ownership(audiounitbox_uuid) WHERE audiounitbox_uuid IS NOT NULL;
```

## Verifying the Migration

After applying the migration, verify that the table structure has been updated:

```sql
-- Check table structure
\d box_ownership

-- Or use this query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'box_ownership'
ORDER BY ordinal_position;
```

## Rolling Back

If you need to roll back this migration, you can restore the original structure:

```sql
-- Create original table structure
CREATE TABLE IF NOT EXISTS box_ownership_old (
  project_id VARCHAR(255) NOT NULL,
  box_uuid VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  owned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, box_uuid)
);

-- Migrate data back (only AudioUnitBox data will be preserved)
INSERT INTO box_ownership_old (project_id, box_uuid, owner_id, owned_at)
SELECT project_id, audiounitbox_uuid, owner_id, owned_at
FROM box_ownership
WHERE audiounitbox_uuid IS NOT NULL;

-- Drop new table and rename
DROP TABLE box_ownership;
ALTER TABLE box_ownership_old RENAME TO box_ownership;

-- Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_owner ON box_ownership(owner_id);
```

## Notes

- The migration assumes existing `box_uuid` values refer to AudioUnitBox UUIDs
- If you have existing TrackBox ownership data stored differently, you may need to adjust the migration script
- Always backup your database before running migrations 