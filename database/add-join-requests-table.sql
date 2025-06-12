-- Create room join requests table
CREATE TABLE IF NOT EXISTS room_join_requests (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id, status) -- Prevent multiple pending requests from same user for same room
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_join_requests_room_id ON room_join_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_room_join_requests_user_id ON room_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_room_join_requests_status ON room_join_requests(status);
