const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('Database connected at:', testResult.rows[0].now);
    
    // Check consent_records table
    const countResult = await pool.query('SELECT COUNT(*) as total FROM consent_records');
    console.log('Total consent records:', countResult.rows[0].total);
    
    // Get sample data
    const sampleResult = await pool.query('SELECT * FROM consent_records LIMIT 5');
    console.log('Sample records:', JSON.stringify(sampleResult.rows, null, 2));
    
    // Check table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    console.log('Table columns:', columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    
    // Check policy_versions table
    const policyCount = await pool.query('SELECT COUNT(*) as total FROM policy_versions');
    console.log('Total policy versions:', policyCount.rows[0].total);
    
    // Get active policies
    const activePolicies = await pool.query('SELECT * FROM policy_versions WHERE is_active = true LIMIT 5');
    console.log('Active policies:', JSON.stringify(activePolicies.rows, null, 2));
    
  } catch (error) {
    console.error('Database error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testDatabase();
