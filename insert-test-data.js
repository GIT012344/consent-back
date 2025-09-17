const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function insertTestData() {
  try {
    // Insert test consent records
    const testData = [
      {
        name_surname: 'สมชาย ใจดี',
        id_passport: '1234567890123',
        user_type: 'customer',
        consent_type: 'privacy',
        consent_language: 'th',
        consent_version: '1.0',
        ip_address: '192.168.1.100'
      },
      {
        name_surname: 'สมหญิง รักดี',
        id_passport: '9876543210987',
        user_type: 'employee',
        consent_type: 'privacy',
        consent_language: 'th',
        consent_version: '1.0',
        ip_address: '192.168.1.101'
      },
      {
        name_surname: 'John Smith',
        id_passport: 'AA1234567',
        user_type: 'partner',
        consent_type: 'privacy',
        consent_language: 'en',
        consent_version: '1.0',
        ip_address: '192.168.1.102'
      }
    ];

    console.log('Inserting test data...');
    
    for (const data of testData) {
      const query = `
        INSERT INTO consent_records 
        (name_surname, id_passport, ip_address, user_type, consent_type, consent_language, consent_version, created_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;
      
      const values = [
        data.name_surname,
        data.id_passport,
        data.ip_address,
        data.user_type,
        data.consent_type,
        data.consent_language,
        data.consent_version
      ];
      
      const result = await pool.query(query, values);
      console.log(`✅ Inserted: ${data.name_surname} (ID: ${result.rows[0].id})`);
    }
    
    // Check total records
    const countResult = await pool.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n✅ Total records in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertTestData();
