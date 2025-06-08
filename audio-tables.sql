-- Audio service database tables

-- Table for storing audio file metadata
CREATE TABLE IF NOT EXISTS audio_files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration DECIMAL(10, 3),
    sample_rate INTEGER,
    channels INTEGER,
    bit_rate INTEGER,
    format VARCHAR(50),
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing audio analysis results
CREATE TABLE IF NOT EXISTS audio_analysis (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
    duration DECIMAL(10, 3),
    sample_rate INTEGER,
    channels INTEGER,
    bit_rate INTEGER,
    codec VARCHAR(50),
    format VARCHAR(50),
    size BIGINT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_created_at ON audio_files(created_at);
CREATE INDEX IF NOT EXISTS idx_audio_analysis_file_id ON audio_analysis(file_id);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_audio_files_updated_at BEFORE UPDATE ON audio_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_analysis_updated_at BEFORE UPDATE ON audio_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
