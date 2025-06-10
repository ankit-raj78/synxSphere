#!/usr/bin/env node

/**
 * Update database schema to add missing columns
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.dev' });

async function updateDatabaseSchema() {
  console.log('🔄 Updating database schema...');
  
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'syncsphere',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'root',
  });

  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL successfully');

    // Check if instruments column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'room_participants' 
      AND column_name = 'instruments'
    `;
    
    const columnResult = await pool.query(checkColumnQuery);
    
    if (columnResult.rows.length === 0) {
      console.log('📝 Adding missing instruments column to room_participants...');
      
      // Add the missing instruments column
      await pool.query(`
        ALTER TABLE room_participants 
        ADD COLUMN instruments JSONB DEFAULT '[]'
      `);
      
      console.log('✅ Added instruments column');
    } else {
      console.log('✅ instruments column already exists');
    }

    // Check if last_active column exists
    const checkLastActiveQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'room_participants' 
      AND column_name = 'last_active'
    `;
    
    const lastActiveResult = await pool.query(checkLastActiveQuery);
    
    if (lastActiveResult.rows.length === 0) {
      console.log('📝 Adding missing last_active column to room_participants...');
      
      // Add the missing last_active column
      await pool.query(`
        ALTER TABLE room_participants 
        ADD COLUMN last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
      
      console.log('✅ Added last_active column');
    } else {
      console.log('✅ last_active column already exists');
    }

    // Verify the table structure
    console.log('\n📋 Current room_participants table structure:');
    const describeQuery = `
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'room_participants'
      ORDER BY ordinal_position
    `;
    
    const describeResult = await pool.query(describeQuery);
    describeResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) = ${row.column_default || 'NULL'}`);
    });

    console.log('\n✅ Database schema update completed successfully!');

  } catch (error) {
    console.error('❌ Database schema update failed:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🎉 Database schema update completed!');
  }
}

// Run the update if called directly
if (require.main === module) {
  updateDatabaseSchema().catch(error => {
    console.error('Schema update failed:', error);
    process.exit(1);
  });
}

module.exports = updateDatabaseSchema;
