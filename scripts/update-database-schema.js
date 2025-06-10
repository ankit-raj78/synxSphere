// Update existing database schema to fix issues
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.dev' });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'syncsphere',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'root',
});

async function updateDatabaseSchema() {
  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');

    console.log('🔧 Updating database schema...');

    // Check if is_online column exists and add it if missing
    const checkIsOnlineColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'room_participants' 
      AND column_name = 'is_online';
    `);

    if (checkIsOnlineColumn.rows.length === 0) {
      console.log('Adding missing is_online column to room_participants table...');
      await client.query(`
        ALTER TABLE room_participants 
        ADD COLUMN is_online BOOLEAN DEFAULT false;
      `);
    }

    // Fix instruments column type (TEXT[] to JSONB for better compatibility)
    const checkInstrumentsColumn = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'room_participants' 
      AND column_name = 'instruments';
    `);

    if (checkInstrumentsColumn.rows.length > 0 && checkInstrumentsColumn.rows[0].data_type === 'ARRAY') {
      console.log('Converting instruments column from TEXT[] to JSONB...');
      await client.query(`
        ALTER TABLE room_participants 
        ALTER COLUMN instruments TYPE JSONB USING instruments::text::jsonb;
      `);
      await client.query(`
        ALTER TABLE room_participants 
        ALTER COLUMN instruments SET DEFAULT '[]';
      `);
    }

    // Check if collaboration_rooms table exists and drop it if it conflicts
    const checkCollaborationRooms = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'collaboration_rooms';
    `);

    if (checkCollaborationRooms.rows.length > 0) {
      console.log('Dropping conflicting collaboration_rooms table...');
      await client.query(`DROP TABLE IF EXISTS collaboration_rooms CASCADE;`);
    }

    // Verify final schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 Current tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Verify room_participants columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'room_participants'
      ORDER BY ordinal_position;
    `);

    console.log('📋 room_participants columns:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) = ${row.column_default || 'NULL'}`);
    });

    client.release();
    console.log('✅ Database schema update completed successfully!');

  } catch (error) {
    console.error('❌ Database schema update failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run update if this script is executed directly
if (require.main === module) {
  updateDatabaseSchema()
    .then(() => {
      console.log('🎉 Database schema update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database schema update failed:', error);
      process.exit(1);
    });
}

module.exports = updateDatabaseSchema;
