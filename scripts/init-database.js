// PostgreSQL Database Initialization Script for SyncSphere
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.dev' });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'syncsphere',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'root',
});

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');

    // Read and execute the SQL initialization script
    const sqlFilePath = path.join(__dirname, '..', 'database', 'postgresql-init.sql');
    
    if (fs.existsSync(sqlFilePath)) {
      console.log('📖 Reading SQL initialization script...');
      const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
      
      console.log('🔧 Executing database initialization...');
      await client.query(sqlScript);
      
      console.log('✅ Database tables created successfully!');
      
      // Verify tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      console.log('📋 Created tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
    } else {
      console.log('⚠️  SQL initialization script not found. Creating basic tables...');
      
      // Create basic tables if SQL file doesn't exist
      await client.query(`
        -- Create extension for UUID generation
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Create users table
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          profile JSONB DEFAULT '{"role": "user", "bio": "", "avatar": ""}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
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
        
        -- Create room_participants table
        CREATE TABLE IF NOT EXISTS room_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'participant',
          instruments TEXT[] DEFAULT '{}',
          is_online BOOLEAN DEFAULT false,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create audio_tracks table
        CREATE TABLE IF NOT EXISTS audio_tracks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
          uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          artist VARCHAR(255),
          duration INTEGER,
          file_path VARCHAR(500),
          waveform JSONB,
          is_currently_playing BOOLEAN DEFAULT false,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
        CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
        CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_audio_tracks_room ON audio_tracks(room_id);
      `);
      
      console.log('✅ Basic database schema created successfully!');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Please make sure PostgreSQL is running and accessible.');
      console.log('💡 You can start PostgreSQL with: brew start postgresql (Mac) or net start postgresql (Windows)');
    } else if (error.code === '3D000') {
      console.log('💡 Database does not exist. Please create it first:');
      console.log(`💡 CREATE DATABASE ${process.env.POSTGRES_DB || 'syncsphere'};`);
    } else if (error.code === '28P01') {
      console.log('💡 Authentication failed. Please check your database credentials.');
    }
    
    throw error;
  } finally {
    await pool.end();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
