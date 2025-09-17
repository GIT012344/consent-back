const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory storage
let consents = [];
let nextId = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// POST /api/consent - Submit consent
app.post('/api/consent', (req, res) => {
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
  
  // Basic validation
  if (!name || !surname || !idPassport) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name, surname, or idPassport',
      errors: [
        !name && { field: 'name', message: 'Name is required' },
        !surname && { field: 'surname', message: 'Surname is required' },
        !idPassport && { field: 'idPassport', message: 'ID/Passport is required' }
      ].filter(Boolean)
    });
  }
  
  // Check if ID is valid length
  if (idPassport.length < 8 || idPassport.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'ID/Passport must be between 8 and 50 characters',
      errors: [{ field: 'idPassport', message: 'ID/Passport must be between 8 and 50 characters' }]
    });
  }
  
  // Create consent record
  const consentRecord = {
    id: nextId++,
    consentId: `CNS${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name,
    surname,
    nameSurname: `${name} ${surname}`,
    idPassport,
    email: email || '',
    phone: phone || '',
    userType: userType || 'customer',
    consentVersion: consentVersion || '1.0',
    policyVersion: policyVersion || consentVersion || '1.0',
    policyTitle: policyTitle || 'Consent Policy',
    language: language || 'th',
    browser: browser || 'Unknown',
    userAgent: userAgent || 'Unknown',
    ipAddress: req.ip || '127.0.0.1',
    consentGiven: true,
    createdDate: new Date().toISOString(),
    isActive: true
  };
  
  // Store consent
  consents.push(consentRecord);
  
  // Return success response
  res.json({
    success: true,
    message: 'Consent submitted successfully',
    data: {
      id: consentRecord.id,
      consentId: consentRecord.consentId,
      nameSurname: consentRecord.nameSurname,
      createdDate: consentRecord.createdDate
    }
  });
});

// GET /api/consent/list - List all consents
app.get('/api/consent/list', (req, res) => {
  res.json({
    success: true,
    data: consents
  });
});

// GET /api/consent/:idPassport - Get consent by ID/Passport
app.get('/api/consent/:idPassport', (req, res) => {
  const { idPassport } = req.params;
  const consent = consents.find(c => c.idPassport === idPassport && c.isActive);
  
  if (!consent) {
    return res.status(404).json({
      success: false,
      message: 'No consent found for this ID/Passport'
    });
  }
  
  res.json({
    success: true,
    data: consent
  });
});

app.listen(PORT, () => {
  console.log(`✅ Simple consent backend running on http://localhost:${PORT}`);
  console.log('📍 Available endpoints:');
  console.log('   GET  /health');
  console.log('   POST /api/consent');
  console.log('   GET  /api/consent/list');
  console.log('   GET  /api/consent/:idPassport');
  console.log('\n💾 Using in-memory storage (no database required)');
});
