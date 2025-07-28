-- ============================================================================
-- Fix Collaboration Database Schema
-- ============================================================================
-- This script creates all necessary tables for OpenDAW collaboration
-- Run this on your PostgreSQL database to fix the collaboration errors
-- ============================================================================

-- First, ensure we're using the correct database
\c opendaw_collab;

-- ============================================================================
-- CORE COLLABORATION TABLES
-- ============================================================================

-- Projects table - stores project metadata and serialized data
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  room_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  data BYTEA,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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

-- User sessions table - track active users in projects
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- COLLABORATION EVENT SYSTEM
-- ============================================================================

-- Event log table - append-only event storage for collaboration
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

-- ============================================================================
-- STUDIO PROJECT PERSISTENCE
-- ============================================================================

-- Studio projects table - for the /api/rooms/{roomId}/studio-project endpoint
CREATE TABLE IF NOT EXISTS studio_projects (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL UNIQUE,
    project_data JSONB NOT NULL,
    audio_files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project files table - stores individual project files
CREATE TABLE IF NOT EXISTS project_files (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_content BYTEA,
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, file_path)
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

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_room_id ON projects(room_id);

-- Box ownership indexes
CREATE INDEX IF NOT EXISTS idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_owner ON box_ownership(owner_id);

-- Box locks indexes
CREATE INDEX IF NOT EXISTS idx_box_locks_project ON box_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_box_locks_expires ON box_locks(expires_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_project ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Collaboration events indexes
CREATE INDEX IF NOT EXISTS collaboration_events_project_idx ON collaboration_events(project_id, ts DESC);
CREATE INDEX IF NOT EXISTS collaboration_events_user_idx ON collaboration_events(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS collaboration_events_type_idx ON collaboration_events(type, ts DESC);

-- Studio projects indexes
CREATE INDEX IF NOT EXISTS idx_studio_projects_room_id ON studio_projects(room_id);

-- Project files indexes
CREATE INDEX IF NOT EXISTS idx_project_files_room_id ON project_files(room_id);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(room_id, file_path);

-- Timeline elements indexes
CREATE INDEX IF NOT EXISTS idx_timeline_elements_project ON timeline_elements(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_elements_track ON timeline_elements(track_id);
CREATE INDEX IF NOT EXISTS idx_timeline_elements_type ON timeline_elements(element_type);

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to clean up expired locks
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

-- Function to update last seen timestamp
CREATE OR REPLACE FUNCTION update_user_session(session_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET last_seen = NOW() 
  WHERE id = session_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Session % not found', session_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get project by room ID
CREATE OR REPLACE FUNCTION get_project_by_room(room_uuid VARCHAR(255))
RETURNS TABLE(
    project_data JSONB,
    audio_files JSONB,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.project_data, sp.audio_files, sp.updated_at
  FROM studio_projects sp
  WHERE sp.room_id = room_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert studio project
CREATE OR REPLACE FUNCTION upsert_studio_project(
    room_uuid VARCHAR(255),
    project_json JSONB,
    audio_json JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO studio_projects (room_id, project_data, audio_files, updated_at)
  VALUES (room_uuid, project_json, audio_json, NOW())
  ON CONFLICT (room_id)
  DO UPDATE SET 
    project_data = EXCLUDED.project_data,
    audio_files = EXCLUDED.audio_files,
    updated_at = NOW();
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

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Create a cleanup job for expired locks (run periodically)
-- This would typically be run by a cron job or scheduled task
-- SELECT cleanup_expired_locks();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables exist
DO $$
DECLARE
    table_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    expected_tables TEXT[] := ARRAY[
        'projects', 'box_ownership', 'box_locks', 'user_sessions',
        'collaboration_events', 'tracks', 'studio_projects', 
        'project_files', 'timeline_elements'
    ];
BEGIN
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All collaboration tables created successfully!';
        RAISE NOTICE '✅ Database schema is ready for OpenDAW collaboration';
    END IF;
END $$;

-- Show table counts
SELECT 
    'projects' as table_name, COUNT(*) as row_count FROM projects
UNION ALL SELECT 
    'studio_projects', COUNT(*) FROM studio_projects
UNION ALL SELECT 
    'collaboration_events', COUNT(*) FROM collaboration_events
UNION ALL SELECT 
    'user_sessions', COUNT(*) FROM user_sessions
UNION ALL SELECT 
    'box_ownership', COUNT(*) FROM box_ownership
UNION ALL SELECT 
    'timeline_elements', COUNT(*) FROM timeline_elements
ORDER BY table_name;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Collaboration database setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created tables:';
    RAISE NOTICE '   • projects - Project metadata and binary data';
    RAISE NOTICE '   • studio_projects - Studio project JSON data';
    RAISE NOTICE '   • collaboration_events - Real-time collaboration events';
    RAISE NOTICE '   • user_sessions - Active user tracking';
    RAISE NOTICE '   • box_ownership - AudioUnit box ownership';
    RAISE NOTICE '   • timeline_elements - Clips and regions';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Created functions:';
    RAISE NOTICE '   • cleanup_expired_locks() - Cleanup utility';
    RAISE NOTICE '   • get_project_by_room() - Project retrieval';
    RAISE NOTICE '   • upsert_studio_project() - Project persistence';
    RAISE NOTICE '   • add_collaboration_event() - Event logging';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Your collaboration system should now work properly!';
    RAISE NOTICE '✅ The /api/rooms/{roomId}/studio-project endpoint will now work';
    RAISE NOTICE '✅ StudioService serialization issues should be resolved';
END $$;
