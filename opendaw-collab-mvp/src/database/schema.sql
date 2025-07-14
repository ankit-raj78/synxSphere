-- OpenDAW Collaboration Database Schema
-- Version: 1.0.0

-- Projects table - stores project metadata and binary data
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
  -- Removed foreign key constraint for MVP simplicity
);

-- Box locks table - simple locking mechanism to prevent conflicts
CREATE TABLE IF NOT EXISTS box_locks (
  project_id VARCHAR(255) NOT NULL,
  box_uuid VARCHAR(255) NOT NULL,
  locked_by VARCHAR(255) NOT NULL,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (project_id, box_uuid)
  -- Removed foreign key constraint for MVP simplicity
);

-- User sessions table - track active users in projects
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
  -- Removed foreign key constraint for MVP simplicity
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_owner ON box_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_box_locks_project ON box_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_box_locks_expires ON box_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_project ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

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
END;
$$ LANGUAGE plpgsql;
