-- Add collaboration tables to main SynxSphere database
-- This script adds the missing collaboration tables that the API endpoints expect

-- Collaboration event system
CREATE TABLE IF NOT EXISTS collaboration_events (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Current track positions/parameters - latest state
CREATE TABLE IF NOT EXISTS tracks (
    project_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INT NOT NULL,
    volume REAL DEFAULT 1.0,
    pan REAL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, track_id)
);

-- Box ownership table - tracks which user owns which AudioUnitBox
CREATE TABLE IF NOT EXISTS box_ownership (
  project_id VARCHAR(255) NOT NULL,
  box_uuid VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  owned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, box_uuid)
);

-- Box locks table - simple locking mechanism to prevent conflicts
CREATE TABLE IF NOT EXISTS box_locks (
  project_id VARCHAR(255) NOT NULL,
  box_uuid VARCHAR(255) NOT NULL,
  locked_by VARCHAR(255) NOT NULL,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (project_id, box_uuid)
);

-- Timeline elements table - for clips and regions
CREATE TABLE IF NOT EXISTS timeline_elements (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    element_id VARCHAR(255) NOT NULL,
    element_type VARCHAR(50) NOT NULL, -- 'clip' or 'region'
    track_id VARCHAR(255) NOT NULL,
    start_time REAL NOT NULL,
    duration REAL NOT NULL,
    sample_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, element_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS collaboration_events_project_idx ON collaboration_events(project_id, ts DESC);
CREATE INDEX IF NOT EXISTS collaboration_events_user_idx ON collaboration_events(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS collaboration_events_type_idx ON collaboration_events(type, ts DESC);

CREATE INDEX IF NOT EXISTS idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_owner ON box_ownership(owner_id);

CREATE INDEX IF NOT EXISTS idx_box_locks_project ON box_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_box_locks_expires ON box_locks(expires_at);

CREATE INDEX IF NOT EXISTS idx_timeline_elements_project ON timeline_elements(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_elements_track ON timeline_elements(track_id);
CREATE INDEX IF NOT EXISTS idx_timeline_elements_type ON timeline_elements(element_type);

-- Utility functions
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM box_locks WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to add collaboration event
CREATE OR REPLACE FUNCTION add_collaboration_event(
    proj_id TEXT,
    usr_id TEXT,
    event_type TEXT,
    event_payload JSONB
)
RETURNS BIGINT AS $$
DECLARE
  event_id BIGINT;
BEGIN
  INSERT INTO collaboration_events (project_id, user_id, type, payload, ts)
  VALUES (proj_id, usr_id, event_type, event_payload, NOW())
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get events since timestamp
CREATE OR REPLACE FUNCTION get_events_since(
    proj_id TEXT,
    since_ts TIMESTAMPTZ DEFAULT '1970-01-01'::timestamptz
)
RETURNS TABLE(
    id BIGINT,
    project_id TEXT,
    user_id TEXT,
    type TEXT,
    payload JSONB,
    ts TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT ce.id, ce.project_id, ce.user_id, ce.type, ce.payload, ce.ts
  FROM collaboration_events ce
  WHERE ce.project_id = proj_id AND ce.ts > since_ts
  ORDER BY ce.ts ASC;
END;
$$ LANGUAGE plpgsql;

-- Show completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Collaboration tables added to main SynxSphere database';
    RAISE NOTICE '✅ The collaboration API endpoints should now work properly';
    RAISE NOTICE '✅ Missing table errors should be resolved';
END $$;
