const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'syncsphere',
  password: process.env.POSTGRES_PASSWORD || 'root',
  port: process.env.POSTGRES_PORT || 5432,
});

async function createJoinRequestsTable() {
  try {
    console.log('Creating room_join_requests table...');
    
    const sqlPath = path.join(__dirname, 'database/add-join-requests-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ room_join_requests table created successfully');
    
    // Test if table was created successfully
    const testResult = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'room_join_requests'"
    );
    
    if (testResult.rows.length > 0) {
      console.log('✅ Table verification successful');
    } else {
      console.log('❌ Table verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error creating join requests table:', error);
  } finally {
    await pool.end();
  }
  
  process.exit(0);
}

createJoinRequestsTable();
