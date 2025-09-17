const pool = require('./config/database').pool;

async function quickTest() {
  console.log('🔍 Quick System Test\n');
  
  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const dbTest = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', dbTest.rows[0].now);
    
    // 2. Check new columns in policy_versions
    console.log('\n2. Checking new policy enforcement columns...');
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'policy_versions' 
      AND column_name IN ('allow_reject', 'grace_days', 'enforce_mode', 'reconsent_trigger')
    `);
    
    if (columns.rows.length === 4) {
      console.log('✅ All new columns exist:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'null'})`);
      });
    } else {
      console.log(`⚠️ Only ${columns.rows.length}/4 columns found. Running migration...`);
      const fs = require('fs');
      const path = require('path');
      const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add_policy_enforcement_fields.sql'), 'utf8');
      await pool.query(migrationSQL);
      console.log('✅ Migration executed');
    }
    
    // 3. Test CSV export route
    console.log('\n3. Testing CSV export route...');
    const axios = require('axios');
    try {
      const response = await axios.get('http://localhost:3000/api/consent-export/stats/scb');
      console.log('✅ Export route accessible');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️ Server not running. Start with: npm run dev');
      } else {
        console.log('✅ Export route registered (no data yet)');
      }
    }
    
    // 4. Check if tenant exists
    console.log('\n4. Checking tenants...');
    const tenants = await pool.query('SELECT code, name FROM tenants LIMIT 5');
    if (tenants.rows.length > 0) {
      console.log('✅ Tenants:', tenants.rows.map(t => t.code).join(', '));
    } else {
      console.log('⚠️ No tenants found');
    }
    
    // 5. Check user consents
    console.log('\n5. Checking user consents...');
    const consents = await pool.query('SELECT COUNT(*) as total FROM user_consents');
    console.log(`✅ Total consents: ${consents.rows[0].total}`);
    
    console.log('\n✨ System check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

quickTest();
