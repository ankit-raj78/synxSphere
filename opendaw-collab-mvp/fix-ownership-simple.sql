DROP TABLE IF EXISTS box_ownership;

CREATE TABLE box_ownership (
    project_id VARCHAR(255) NOT NULL,
    trackbox_uuid VARCHAR(255),
    audiounitbox_uuid VARCHAR(255),
    owner_id VARCHAR(255) NOT NULL,
    owned_at TIMESTAMP DEFAULT NOW(),
    room_id VARCHAR(255) NOT NULL,
    CONSTRAINT check_uuid_presence CHECK (
        (trackbox_uuid IS NOT NULL AND audiounitbox_uuid IS NULL) OR 
        (trackbox_uuid IS NULL AND audiounitbox_uuid IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_box_ownership_trackbox_unique 
ON box_ownership(project_id, trackbox_uuid) 
WHERE trackbox_uuid IS NOT NULL;

CREATE UNIQUE INDEX idx_box_ownership_audiounitbox_unique 
ON box_ownership(project_id, audiounitbox_uuid) 
WHERE audiounitbox_uuid IS NOT NULL;

CREATE INDEX idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX idx_box_ownership_owner ON box_ownership(owner_id);
CREATE INDEX idx_box_ownership_room ON box_ownership(room_id);
CREATE INDEX idx_box_ownership_trackbox ON box_ownership(trackbox_uuid) WHERE trackbox_uuid IS NOT NULL;
CREATE INDEX idx_box_ownership_audiounitbox ON box_ownership(audiounitbox_uuid) WHERE audiounitbox_uuid IS NOT NULL; 