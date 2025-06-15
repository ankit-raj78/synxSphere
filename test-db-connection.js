const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'syncsphere',
  password: 'root',
  port: 5432,
});

pool.query('SELECT NOW()')
  .then(result => {
    console.log('✅ PostgreSQL connection successful');
    console.log('Current time:', result.rows[0].now);
    pool.end();
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    pool.end();
  });
