-- Create users table for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile JSONB DEFAULT '{"role": "user", "bio": "", "avatar": ""}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    is_live BOOLEAN DEFAULT false,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    playback_position INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'
);

-- Create room_participants table for many-to-many relationship
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'participant',
    instruments JSONB DEFAULT '[]',
    is_online BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Create audio_tracks table
CREATE TABLE IF NOT EXISTS audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    duration VARCHAR(20),
    file_path VARCHAR(500),
    waveform JSONB,
    is_currently_playing BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create audio_files table for individual file management
CREATE TABLE IF NOT EXISTS audio_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration NUMERIC(10,2),
    sample_rate INTEGER,
    channels INTEGER,
    bit_rate INTEGER,
    format VARCHAR(50),
    is_processed BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audio_analysis table for storing analysis results
CREATE TABLE IF NOT EXISTS audio_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE UNIQUE,
    duration NUMERIC(10,2),
    sample_rate INTEGER,
    channels INTEGER,
    bit_rate INTEGER,
    codec VARCHAR(50),
    format VARCHAR(50),
    size BIGINT,
    tempo NUMERIC(6,2),
    key_signature VARCHAR(10),
    loudness NUMERIC(8,2),
    waveform_data JSONB,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms (creator_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants (room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_room ON audio_tracks (room_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_uploader ON audio_tracks (uploader_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_user ON audio_files (user_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_room ON audio_files (room_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_created ON audio_files (created_at);
CREATE INDEX IF NOT EXISTS idx_audio_analysis_file ON audio_analysis (file_id);

-- Create triggers for rooms
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON rooms
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for audio_files
DROP TRIGGER IF EXISTS update_audio_files_updated_at ON audio_files;
CREATE TRIGGER update_audio_files_updated_at 
    BEFORE UPDATE ON audio_files
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for audio_analysis
DROP TRIGGER IF EXISTS update_audio_analysis_updated_at ON audio_analysis;
CREATE TRIGGER update_audio_analysis_updated_at 
    BEFORE UPDATE ON audio_analysis
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
