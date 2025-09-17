// Simple test to check what's wrong
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Database pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

// Test route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Simple policy routes
app.get('/api/simple-policy/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM policy_versions LIMIT 10');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/simple-policy/active', async (req, res) => {
  const { userType, language } = req.query;
  
  if (!userType || !language) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing userType or language' 
    });
  }
  
  try {
    const result = await pool.query(`
      SELECT pv.* FROM policy_versions pv
      JOIN policies p ON pv.policy_id = p.id
      WHERE pv.is_active = true
      AND pv.language = $1
      LIMIT 1
    `, [language]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active policy found' 
      });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/simple-policy', async (req, res) => {
  const { version, language, userType, title, content } = req.body;
  
  if (!version || !language || !userType || !title || !content) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }
  
  try {
    // Create a simple policy
    const result = await pool.query(`
      INSERT INTO policy_versions 
      (policy_id, version, title, content, language, is_active)
      VALUES (1, $1, $2, $3, $4, true)
      RETURNING id
    `, [version, title, content, language]);
    
    res.json({ 
      success: true, 
      data: { 
        id: result.rows[0].id,
        consentLink: `/consent/${userType}?lang=${language.split('-')[0]}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log('📍 Endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/simple-policy/list');
  console.log('   GET  /api/simple-policy/active?userType=customer&language=th-TH');
  console.log('   POST /api/simple-policy');
});
