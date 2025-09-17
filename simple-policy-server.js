const express = require('express');
const cors = require('cors');
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
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
  
  const updatedPolicy = {
    ...policies[policyIndex],
    ...req.body,
    id: policies[policyIndex].id,
    updated_at: new Date().toISOString()
  };
  
  policies[policyIndex] = updatedPolicy;
  res.json({ success: true, data: updatedPolicy });
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
    ipAddress,
    timestamp
  } = req.body;

  // Simple validation
  if (!name || !surname || !idPassport || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // For demo, just return success
  res.json({
    success: true,
    message: 'Consent recorded successfully',
    data: {
      consentId: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userType,
      language
    }
  });
});

// Get active policy for user type and language
app.get('/api/policy/active', async (req, res) => {
  const { userType, language } = req.query;
  
  const policy = policies.find(p => 
    p.userType === userType && 
    p.language === language && 
    p.is_active === true
  );
  
  if (!policy) {
    // Return default policy
    return res.json({
      success: true,
      data: {
        id: 0,
        version: '1.0',
        title: 'Privacy Policy',
        content: '<h2>Privacy Policy</h2><p>This is the privacy policy content.</p>',
        policy_content: '<h2>Privacy Policy</h2><p>This is the privacy policy content.</p>',
        userType: userType || 'customer',
        user_type: userType || 'customer',
        language: language || 'th',
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

// Titles API
app.get('/api/titles', async (req, res) => {
  const titles = [
    { id: 1, title_th: 'นาย', title_en: 'Mr.', is_active: true },
    { id: 2, title_th: 'นาง', title_en: 'Mrs.', is_active: true },
    { id: 3, title_th: 'นางสาว', title_en: 'Ms.', is_active: true }
  ];
  res.json({ success: true, data: titles });
});

// Form fields API
app.get('/api/form-fields', async (req, res) => {
  const fields = [
    {
      id: 1,
      field_name: 'name',
      field_label_th: 'ชื่อ',
      field_label_en: 'First Name',
      field_type: 'text',
      is_required: true,
      is_active: true,
      display_order: 1
    },
    {
      id: 2,
      field_name: 'surname',
      field_label_th: 'นามสกุล',
      field_label_en: 'Last Name',
      field_type: 'text',
      is_required: true,
      is_active: true,
      display_order: 2
    },
    {
      id: 3,
      field_name: 'idPassport',
      field_label_th: 'เลขบัตรประชาชน/พาสปอร์ต',
      field_label_en: 'ID/Passport Number',
      field_type: 'text',
      is_required: true,
      is_active: true,
      display_order: 3
    },
    {
      id: 4,
      field_name: 'email',
      field_label_th: 'อีเมล',
      field_label_en: 'Email',
      field_type: 'email',
      is_required: true,
      is_active: true,
      display_order: 4
    },
    {
      id: 5,
      field_name: 'phone',
      field_label_th: 'เบอร์โทรศัพท์',
      field_label_en: 'Phone Number',
      field_type: 'tel',
      is_required: true,
      is_active: true,
      display_order: 5
    }
  ];
  res.json({ success: true, data: fields });
});

app.listen(PORT, () => {
  console.log(`✅ Simple Policy Server running on http://localhost:${PORT}`);
  console.log('📍 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/simple-policy');
  console.log('   GET  /api/simple-policy/:id');
  console.log('   PUT  /api/simple-policy/:id');
  console.log('   DELETE /api/simple-policy/:id');
  console.log('   POST /api/simple-policy');
  console.log('   POST /api/consent');
  console.log('   GET  /api/policy/active');
  console.log('   GET  /api/titles');
  console.log('   GET  /api/form-fields');
});
