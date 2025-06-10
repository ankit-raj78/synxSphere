const { Pool } = require('pg')

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'syncsphere',
    password: 'root',
    port: 5432,
})

async function createCompositionsTable() {
    console.log('🔄 Creating compositions table...')

    try {
        // Create compositions table
        const createTableSQL = `
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
        `
        
        await pool.query(createTableSQL)
        console.log('✅ Compositions table created successfully')

        // Create indexes
        const createIndexesSQL = `
            CREATE INDEX IF NOT EXISTS idx_compositions_user ON compositions (user_id);
            CREATE INDEX IF NOT EXISTS idx_compositions_room ON compositions (room_id);
            CREATE INDEX IF NOT EXISTS idx_compositions_created ON compositions (created_at);
        `
        
        await pool.query(createIndexesSQL)
        console.log('✅ Compositions indexes created')

        // Create composition_analysis table
        const createAnalysisTableSQL = `
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
        `
        
        await pool.query(createAnalysisTableSQL)
        console.log('✅ Composition analysis table created')

        // Create/update trigger function
        const createTriggerFunctionSQL = `
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `
        
        await pool.query(createTriggerFunctionSQL)

        // Create triggers
        const createTriggersSQL = `
            DROP TRIGGER IF EXISTS update_compositions_updated_at ON compositions;
            CREATE TRIGGER update_compositions_updated_at 
                BEFORE UPDATE ON compositions
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_composition_analysis_updated_at ON composition_analysis;
            CREATE TRIGGER update_composition_analysis_updated_at 
                BEFORE UPDATE ON composition_analysis
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
        `
        
        await pool.query(createTriggersSQL)
        console.log('✅ Triggers created')

        console.log('🎉 Compositions tables created successfully!')

    } catch (error) {
        console.error('❌ Error creating compositions table:', error)
        throw error
    } finally {
        await pool.end()
    }
}

// Run the migration
createCompositionsTable()
    .then(() => {
        console.log('✅ Migration completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    })
