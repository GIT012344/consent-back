const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock consent API that always returns success
app.post('/api/consent', (req, res) => {
  console.log('Received consent:', req.body);
  
  // Always return success for testing
  res.json({
    success: true,
    message: 'Consent submitted successfully',
    data: {
      id: Date.now(),
      consentId: `CNS${Date.now()}`,
      nameSurname: `${req.body.name || ''} ${req.body.surname || ''}`.trim(),
      createdDate: new Date().toISOString()
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'mock-consent-api' });
});

app.listen(PORT, () => {
  console.log(`✅ Mock Consent API running on http://localhost:${PORT}`);
  console.log('📍 POST /api/consent - Always returns success');
});
