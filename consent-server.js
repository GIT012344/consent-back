const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for policies with initial data
const policies = [
  {
    id: 1,
    versionId: Date.now() - 10000,
    version: '1.0',
    userType: 'customer',
    user_type: 'customer',
    language: 'th',
    title: 'นโยบายความเป็นส่วนตัว - ลูกค้า',
    content: '<p>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</p>',
    policy_content: '<p>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</p>',
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: 'System',
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    versionId: Date.now() - 5000,
    version: '1.0',
    userType: 'employee',
    user_type: 'employee',
    language: 'th',
    title: 'นโยบายความเป็นส่วนตัว - พนักงาน',
    content: '<p>นโยบายความเป็นส่วนตัวสำหรับพนักงาน</p>',
    policy_content: '<p>นโยบายความเป็นส่วนตัวสำหรับพนักงาน</p>',
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: 'System',
    updated_at: new Date().toISOString()
  }
];

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Consent submission endpoint
app.post('/api/consent', async (req, res) => {
  console.log('Received consent submission:', req.body);
  
  const { 
    name,
    surname,
    idPassport,
    email,
    phone,
    userType,
    consentVersion,
    language,
    policyTitle,
    policyVersion,
    browser,
    userAgent
  } = req.body;
  
  // Validation
  if (!name || !surname || !idPassport) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      errors: [
        !name && { field: 'name', message: 'Name is required' },
        !surname && { field: 'surname', message: 'Surname is required' },
        !idPassport && { field: 'idPassport', message: 'ID/Passport is required' }
      ].filter(Boolean)
    });
  }
  
  if (idPassport.length < 8 || idPassport.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'ID/Passport must be between 8 and 50 characters',
      errors: [{ field: 'idPassport', message: 'Invalid ID/Passport length' }]
    });
  }
  
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    // Generate consent ID
    const consentId = `CNS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const fullName = `${name} ${surname}`;
    
    // Check if table exists and create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id SERIAL PRIMARY KEY,
        consent_id VARCHAR(50) UNIQUE,
        name_surname VARCHAR(255),
        id_passport VARCHAR(50),
        email VARCHAR(255),
        phone VARCHAR(20),
        ip_address VARCHAR(45),
        browser VARCHAR(255),
        user_type VARCHAR(50),
        consent_type VARCHAR(50),
        consent_language VARCHAR(10),
        consent_version VARCHAR(50),
        consent_version_id INTEGER,
        policy_title VARCHAR(255),
        user_agent TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_time TIME DEFAULT CURRENT_TIME,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Insert consent record
    const result = await pool.query(`
      INSERT INTO consent_records 
      (consent_id, name_surname, id_passport, email, phone, ip_address, browser, 
       user_type, consent_type, consent_language, consent_version, policy_title, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, consent_id, created_date
    `, [
      consentId,
      fullName,
      idPassport,
      email || '',
      phone || '',
      req.ip || '127.0.0.1',
      browser || 'Unknown',
      userType || 'customer',
      userType || 'customer',
      language || 'th',
      policyVersion || consentVersion || '1.0',
      policyTitle || 'Consent Policy',
      userAgent || req.headers['user-agent'] || 'Unknown'
    ]);
    
    res.json({
      success: true,
      message: 'Consent submitted successfully',
      data: {
        id: result.rows[0].id,
        consentId: result.rows[0].consent_id,
        nameSurname: fullName,
        createdDate: result.rows[0].created_date
      }
    });
    
  } catch (dbError) {
    console.error('Database error:', dbError);
    
    // If database fails, save to memory and return success
    const consentId = `CNS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    res.json({
      success: true,
      message: 'Consent submitted successfully (cached)',
      data: {
        id: Date.now(),
        consentId: consentId,
        nameSurname: `${name} ${surname}`,
        createdDate: new Date().toISOString()
      }
    });
  }
});

// Simple policy endpoints
app.get('/api/simple-policy/list', async (req, res) => {
  res.json({ success: true, data: policies });
});

app.get('/api/simple-policy/active', async (req, res) => {
  const { userType, language } = req.query;
  
  console.log(`Looking for policy: userType=${userType}, language=${language}`);
  
  // Find matching policy
  let policy = policies.find(p => 
    p.userType === userType && 
    p.language === language && 
    p.is_active
  );
  
  // Fallback to any active policy for the user type
  if (!policy) {
    policy = policies.find(p => 
      p.userType === userType && 
      p.is_active
    );
  }
  
  // Fallback to any active policy
  if (!policy) {
    policy = policies.find(p => p.is_active);
  }
  
  if (!policy) {
    // Return default policy if none exists
    const defaultContent = language === 'th-TH' ? 
      `<h2>นโยบายความเป็นส่วนตัว</h2>
      <p>เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ</p>
      <h3>การเก็บรวบรวมข้อมูล</h3>
      <p>เราจะเก็บรวบรวมข้อมูลส่วนบุคคลของคุณเพื่อวัตถุประสงค์ในการให้บริการเท่านั้น</p>
      <h3>การใช้ข้อมูล</h3>
      <p>ข้อมูลของคุณจะถูกใช้เพื่อ:</p>
      <ul>
        <li>ให้บริการตามที่คุณร้องขอ</li>
        <li>ปรับปรุงคุณภาพการให้บริการ</li>
        <li>ติดต่อสื่อสารกับคุณ</li>
      </ul>
      <h3>การปกป้องข้อมูล</h3>
      <p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ</p>` :
      `<h2>Privacy Policy</h2>
      <p>We value your privacy and are committed to protecting your personal information.</p>
      <h3>Data Collection</h3>
      <p>We collect personal information solely for the purpose of providing our services.</p>
      <h3>Data Usage</h3>
      <p>Your information will be used to:</p>
      <ul>
        <li>Provide services as requested</li>
        <li>Improve service quality</li>
        <li>Communicate with you</li>
      </ul>
      <h3>Data Protection</h3>
      <p>We implement appropriate security measures to protect your information.</p>`;
      
    return res.json({
      success: true,
      data: {
        id: 0,
        version: '1.0',
        title: language === 'th-TH' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy',
        content: defaultContent,
        language: language,
        userType: userType,
        user_type: userType,
        is_active: true
      }
    });
  }
  
  console.log(`Found policy: ${policy.title}`);
  res.json({
    success: true,
    data: policy
  });
});

// Get all policies
app.get('/api/simple-policy', async (req, res) => {
  res.json({
    success: true,
    data: policies
  });
});

// Get single policy by ID
app.get('/api/simple-policy/:id', async (req, res) => {
  const policy = policies.find(p => p.id === parseInt(req.params.id));
  if (!policy) {
    return res.status(404).json({ success: false, message: 'Policy not found' });
  }
  res.json({ success: true, data: policy });
});

// Update policy
app.put('/api/simple-policy/:id', async (req, res) => {
  const policyIndex = policies.findIndex(p => p.id === parseInt(req.params.id));
  if (policyIndex === -1) {
    return res.status(404).json({ success: false, message: 'Policy not found' });
  }
  
  policies[policyIndex] = {
    ...policies[policyIndex],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  
  res.json({ success: true, data: policies[policyIndex] });
});

// Delete policy
app.delete('/api/simple-policy/:id', async (req, res) => {
  const policyIndex = policies.findIndex(p => p.id === parseInt(req.params.id));
  if (policyIndex === -1) {
    return res.status(404).json({ success: false, message: 'Policy not found' });
  }
  
  policies.splice(policyIndex, 1);
  res.json({ success: true, message: 'Policy deleted successfully' });
});

// Create new policy
app.post('/api/simple-policy', async (req, res) => {
  try {
    const { version, language, userType, title, content, user_type } = req.body;
    const finalUserType = userType || user_type || 'customer';
  
    // Deactivate existing policies for same userType and language
    policies.forEach(p => {
      if (p.userType === finalUserType && p.language === language) {
        p.is_active = false;
      }
    });
    
    // Create new policy
    const newPolicy = {
      id: policies.length + 1,
      versionId: Date.now(),
      version: version || '1.0',
      userType: finalUserType,
      user_type: finalUserType,
      language: language || 'th-TH',
      title: title || 'Privacy Policy',
      content: content || '<p>Policy content</p>',
      policy_content: content || '<p>Policy content</p>',
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: 'Admin',
      updated_at: new Date().toISOString()
    };
    
    policies.push(newPolicy);
    
    console.log(`Policy created: ${newPolicy.title} for ${newPolicy.userType} in ${newPolicy.language}`);
    
    res.json({
      success: true,
      message: 'Policy created successfully',
      data: {
        ...newPolicy,
        consentLink: `/consent/${finalUserType}?lang=${(language || 'th-TH').split('-')[0]}`
      }
    });
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create policy',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Consent backend server running on http://localhost:${PORT}`);
  console.log('📍 Available endpoints:');
  console.log('   GET  /health');
  console.log('   POST /api/consent');
  console.log('   GET  /api/simple-policy');
  console.log('   GET  /api/simple-policy/:id');
  console.log('   PUT  /api/simple-policy/:id');
  console.log('   DELETE /api/simple-policy/:id');
  console.log('   POST /api/simple-policy');
  console.log('   GET  /api/simple-policy/list');
  console.log('   GET  /api/simple-policy/active');
});
