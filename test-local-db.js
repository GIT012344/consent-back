const { Pool } = require('pg');

// Local database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function testConnection() {
  try {
    console.log('Testing connection to local PostgreSQL...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    console.log('Current time from database:', result.rows[0].now);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nExisting tables:');
    tables.rows.forEach(row => console.log('  -', row.table_name));
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. PostgreSQL is running on localhost:5432');
    console.error('2. Database "consent" exists');
    console.error('3. User "postgres" with password "4321" has access');
    process.exit(1);
  }
}

testConnection();
