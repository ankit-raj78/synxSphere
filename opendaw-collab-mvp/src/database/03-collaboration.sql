-- 03-collaboration.sql
-- Schema for realtime collaboration events and current track state

-- Event log (append-only)
CREATE TABLE IF NOT EXISTS collaboration_events (
    id          BIGSERIAL PRIMARY KEY,
    project_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    type        TEXT NOT NULL,
    payload     JSONB NOT NULL,
    ts          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collaboration_events_project_idx
    ON collaboration_events(project_id, ts DESC);

-- Current track positions / parameters (latest state)
CREATE TABLE IF NOT EXISTS tracks (
    project_id TEXT    NOT NULL,
    track_id   TEXT    NOT NULL,
    position   INT     NOT NULL,
    volume     REAL    DEFAULT 1.0,
    pan        REAL    DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, track_id)
); 