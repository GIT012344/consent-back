const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory storage for policies
let policies = [];
let nextId = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// List all policies
app.get('/api/simple-policy/list', (req, res) => {
  res.json({ success: true, data: policies });
});

// Get active policy
app.get('/api/simple-policy/active', (req, res) => {
  const { userType, language } = req.query;
  
  if (!userType || !language) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing userType or language' 
    });
  }
  
  const activePolicy = policies.find(p => 
    p.userType === userType && 
    p.language === language && 
    p.is_active === true
  );
  
  if (!activePolicy) {
    return res.status(404).json({ 
      success: false, 
      message: 'No active policy found' 
    });
  }
  
  res.json({ success: true, data: activePolicy });
});

// Create new policy
app.post('/api/simple-policy', (req, res) => {
  const { version, language, userType, title, content, effective_date, is_mandatory, enforce_mode } = req.body;
  
  if (!version || !language || !userType || !title || !content) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }
  
  const newPolicy = {
    id: nextId++,
    version,
    language,
    userType,
    title,
    content,
    effective_date: effective_date || new Date().toISOString().split('T')[0],
    is_mandatory: is_mandatory !== undefined ? is_mandatory : true,
    enforce_mode: enforce_mode || 'strict',
    is_active: true,
    created_at: new Date()
  };
  
  policies.push(newPolicy);
  
  const langCode = language === 'th-TH' ? 'th' : 'en';
  const consentLink = `/consent/${userType}?lang=${langCode}`;
  
  res.json({ 
    success: true,
    message: 'Policy created successfully',
    data: {
      versionId: newPolicy.id,
      version: newPolicy.version,
      userType: newPolicy.userType,
      language: newPolicy.language,
      title: newPolicy.title,
      consentLink
    }
  });
});

// Update policy
app.put('/api/simple-policy/:id', (req, res) => {
  const { id } = req.params;
  const policyIndex = policies.findIndex(p => p.id === parseInt(id));
  
  if (policyIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      error: 'Policy not found' 
    });
  }
  
  policies[policyIndex] = { ...policies[policyIndex], ...req.body };
  
  res.json({
    success: true,
    message: 'Policy updated successfully',
    data: policies[policyIndex]
  });
});

// Delete policy
app.delete('/api/simple-policy/:id', (req, res) => {
  const { id } = req.params;
  const policyIndex = policies.findIndex(p => p.id === parseInt(id));
  
  if (policyIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      error: 'Policy not found' 
    });
  }
  
  policies.splice(policyIndex, 1);
  
  res.json({
    success: true,
    message: 'Policy deleted successfully'
  });
});

// Add some default test data
policies.push({
  id: nextId++,
  version: '1.0.0',
  language: 'th-TH',
  userType: 'customer',
  title: 'นโยบายความเป็นส่วนตัว',
  content: '<h1>นโยบายความเป็นส่วนตัว</h1><p>เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ</p>',
  effective_date: '2024-01-01',
  is_mandatory: true,
  enforce_mode: 'strict',
  is_active: true,
  created_at: new Date()
});

app.listen(PORT, () => {
  console.log(`✅ Simple backend server running on http://localhost:${PORT}`);
  console.log('📍 Available endpoints:');
  console.log('   GET    /health');
  console.log('   GET    /api/simple-policy/list');
  console.log('   GET    /api/simple-policy/active?userType=customer&language=th-TH');
  console.log('   POST   /api/simple-policy');
  console.log('   PUT    /api/simple-policy/:id');
  console.log('   DELETE /api/simple-policy/:id');
  console.log('\n💾 Using in-memory storage (no database required)');
});
