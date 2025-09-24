const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fullSystemCheck() {
  console.log('🔍 FULL SYSTEM CHECK\n');
  console.log('='.repeat(50));
  
  // 1. Database Check
  console.log('\n📊 DATABASE STATUS:');
  try {
    const client = await pool.connect();
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`✅ Connected to database`);
    console.log(`   Tables (${tables.rows.length}):`);
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));
    
    // Check policies
    const policies = await client.query(`
      SELECT user_type, language, title, is_active 
      FROM policy_versions WHERE is_active = true
    `);
    
    console.log(`\n   Active Policies (${policies.rows.length}):`);
    policies.rows.forEach(p => {
      console.log(`   - ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    // Check consent records
    const consents = await client.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n   Consent Records: ${consents.rows[0].count}`);
    
    client.release();
  } catch (error) {
    console.log(`❌ Database Error: ${error.message}`);
  }
  
  // 2. Backend API Check
  console.log('\n🔌 BACKEND API STATUS:');
  const apiEndpoints = [
    { url: 'http://localhost:3000/health', name: 'Health Check' },
    { url: 'http://localhost:3000/api/simple-policy/active?userType=customer&language=th', name: 'Policy API' },
    { url: 'http://localhost:3000/api/consent/records', name: 'Consent Records API' },
    { url: 'http://localhost:3000/api/form-fields', name: 'Form Fields API' },
    { url: 'http://localhost:3000/api/titles', name: 'Titles API' }
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await axios.get(endpoint.url, { timeout: 2000 });
      console.log(`   ✅ ${endpoint.name}: OK (${response.status})`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ ${endpoint.name}: Backend not running on port 3000`);
      } else {
        console.log(`   ⚠️ ${endpoint.name}: ${error.response?.status || error.code}`);
      }
    }
  }
  
  // 3. Frontend Routes Check
  console.log('\n🌐 FRONTEND ROUTES:');
  const frontendRoutes = [
    '/',
    '/consent/select-language',
    '/consent/customer?lang=th',
    '/consent/employee?lang=th',
    '/consent/partner?lang=th',
    '/admin/login',
    '/admin/dashboard',
    '/admin/policies',
    '/create-policy',
    '/check-consent'
  ];
  
  console.log('   Available routes:');
  frontendRoutes.forEach(route => {
    console.log(`   - http://localhost:3003${route}`);
  });
  
  // 4. System Summary
  console.log('\n📋 SYSTEM SUMMARY:');
  console.log('   Backend: http://localhost:3000');
  console.log('   Frontend: http://localhost:3003');
  console.log('   Database: PostgreSQL on localhost:5432');
  
  // 5. Common Issues Check
  console.log('\n⚠️ COMMON ISSUES TO CHECK:');
  console.log('   1. Backend server running? (node server.js in consent-back)');
  console.log('   2. Frontend running? (npm start in consent folder)');
  console.log('   3. PostgreSQL service running?');
  console.log('   4. Correct ports? Backend:3000, Frontend:3003');
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ System check completed!');
  
  await pool.end();
}

fullSystemCheck().catch(console.error);
