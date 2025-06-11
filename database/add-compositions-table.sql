-- Add compositions table to separate composed audio from uploaded files
-- Create compositions table
CREATE TABLE IF NOT EXISTS compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration NUMERIC(10,2),
    source_track_ids UUID[],
    source_track_count INTEGER DEFAULT 0,
    composition_settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for compositions
CREATE INDEX IF NOT EXISTS idx_compositions_user ON compositions (user_id);
CREATE INDEX IF NOT EXISTS idx_compositions_room ON compositions (room_id);
CREATE INDEX IF NOT EXISTS idx_compositions_created ON compositions (created_at);

-- Create trigger for compositions
DROP TRIGGER IF EXISTS update_compositions_updated_at ON compositions;
CREATE TRIGGER update_compositions_updated_at 
    BEFORE UPDATE ON compositions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create composition_analysis table for storing analysis results
CREATE TABLE IF NOT EXISTS composition_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composition_id UUID REFERENCES compositions(id) ON DELETE CASCADE UNIQUE,
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

-- Create index for composition_analysis
CREATE INDEX IF NOT EXISTS idx_composition_analysis_composition ON composition_analysis (composition_id);

-- Create trigger for composition_analysis
DROP TRIGGER IF EXISTS update_composition_analysis_updated_at ON composition_analysis;
CREATE TRIGGER update_composition_analysis_updated_at 
    BEFORE UPDATE ON composition_analysis
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
