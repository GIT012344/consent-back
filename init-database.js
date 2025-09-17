const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    console.log('🔄 Initializing database tables...');
    
    // Read and execute SQL migration
    const sqlPath = path.join(__dirname, 'migrations', 'create-form-fields-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Database tables initialized successfully');
    console.log('📋 Tables created/verified:');
    console.log('   - consent_form_fields');
    console.log('   - consent_titles');
    
    // Check if data exists
    const fieldsResult = await pool.query('SELECT COUNT(*) FROM consent_form_fields');
    const titlesResult = await pool.query('SELECT COUNT(*) FROM consent_titles');
    
    console.log(`📊 Form fields count: ${fieldsResult.rows[0].count}`);
    console.log(`📊 Titles count: ${titlesResult.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
