const pool = require('./config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Check if consent_titles table exists and its structure
    const titlesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_titles'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 consent_titles columns:');
    if (titlesCheck.rows.length > 0) {
      titlesCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ❌ Table does not exist');
    }
    
    console.log('\n');
    
    // Check if consent_form_fields table exists
    const fieldsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_form_fields'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 consent_form_fields columns:');
    if (fieldsCheck.rows.length > 0) {
      fieldsCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ❌ Table does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
