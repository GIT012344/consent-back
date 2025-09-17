# 🔌 คู่มือการเชื่อมต่อ Frontend กับ Backend

## ⚠️ ปัญหาที่พบและวิธีแก้ไข

### 1. Frontend เรียก API ผิด Endpoint

#### ❌ ปัญหาที่พบใน AdminConsentDashboard.js
```javascript
// ผิด - เรียก tenant-policy แต่ควรเรียก admin/reports
const response = await axios.get(`${API_BASE_URL}/tenant-policy/statistics`);
```

#### ✅ แก้ไขเป็น
```javascript
// ถูกต้อง - เรียก endpoint ใหม่ที่สร้าง
const response = await axios.get(`${API_BASE_URL}/admin/reports/statistics`);
```

### 2. การ Mapping API Endpoints

| หน้า Frontend | API เดิม (ผิด) | API ใหม่ (ถูก) |
|--------------|----------------|----------------|
| **AdminConsentDashboard** | | |
| - Statistics | `/tenant-policy/statistics` | `/admin/reports/statistics` |
| - Export CSV | `/export/csv` | `/admin/reports/consents?format=csv` |
| - Recent Consents | `/tenant-consent/list` | `/admin/reports/consents` |
| **AdminPolicyManager** | | |
| - List Versions | `/policy-versions` | `/admin/policy-versions` |
| - Create Version | `/policy-versions` | `/admin/policy-versions` |
| - Publish Version | `/policy-versions/:id/publish` | `/admin/policy-versions/:id/publish` |
| - Delete Version | `/policy-versions/:id` | `/admin/policy-versions/:id` |
| **ConsentForm (User)** | | |
| - Get Config | `/consent/config` | `/{tenant}/consent` |
| - Get Policy | `/consent/active-version` | `/consent/version` |
| - Submit Consent | `/consent/submit` | `/consent/accept` |

---

## 📝 ไฟล์ที่ต้องแก้ไขใน Frontend

### 1. src/pages/AdminConsentDashboard.js
```javascript
// แก้ไข Line 38
// เดิม:
const response = await axios.get(`${API_BASE_URL}/tenant-policy/statistics?${params}`);

// ใหม่:
const response = await axios.get(`${API_BASE_URL}/admin/reports/statistics?${params}`);

// แก้ไข Line 52 (fetchRecentConsents)
// เดิม:
const response = await axios.get(`${API_BASE_URL}/tenant-consent/list?${params}`);

// ใหม่:
const response = await axios.get(`${API_BASE_URL}/admin/reports/consents?${params}`);

// แก้ไข Line 75 (exportData)
// เดิม:
window.open(`${API_BASE_URL}/export/${format}?${params}`, '_blank');

// ใหม่:
window.open(`${API_BASE_URL}/admin/reports/consents?format=${format}&${params}`, '_blank');
```

### 2. src/pages/AdminPolicyManager.js
```javascript
// แก้ไข API Base Path
// เดิม:
const API_PATH = '/api/policy-versions';

// ใหม่:
const API_PATH = '/api/admin/policy-versions';

// แก้ไขทุก axios call ให้ใช้ path ใหม่
```

### 3. src/components/ConsentForm.js
```javascript
// แก้ไข fetchPolicyVersion
// เดิม:
const response = await axios.get(`${API_BASE_URL}/consent/active-version/${userType}/${language}`);

// ใหม่:
const response = await axios.post(`${API_BASE_URL}/consent/version`, {
  tenant: window.location.pathname.split('/')[1], // ดึง tenant จาก URL
  kind: 'privacy',
  audience: userType,
  language: language
});

// แก้ไข submitConsent
// เดิม:
const response = await axios.post(`${API_BASE_URL}/consent/submit`, submitData);

// ใหม่:
const response = await axios.post(`${API_BASE_URL}/consent/accept`, {
  ...submitData,
  tenant: window.location.pathname.split('/')[1],
  policyVersionId: currentVersion.id
});
```

---

## 🚀 ขั้นตอนการทดสอบ

### Step 1: เริ่ม Backend
```bash
cd consent-back
npm run dev
# ✅ Server running on port 3000
```

### Step 2: ทดสอบ API ด้วย curl
```bash
# Test 1: Get tenant config
curl http://localhost:3000/sample-tenant/consent

# Test 2: Get statistics
curl http://localhost:3000/api/admin/reports/statistics?tenant=sample-tenant

# Test 3: List policy versions
curl http://localhost:3000/api/admin/policy-versions?tenant=sample-tenant
```

### Step 3: เริ่ม Frontend
```bash
cd consent
npm start
# ✅ Running on port 3001
```

### Step 4: ทดสอบหน้าต่างๆ
1. **User Flow**: http://localhost:3001/sample-tenant/consent
2. **Admin Dashboard**: http://localhost:3001/admin/dashboard
3. **Policy Manager**: http://localhost:3001/admin/policy-manager

---

## 🔧 Debug Tips

### 1. ดู Network Tab ใน Browser
```
F12 > Network Tab > XHR
- ดู Request URL ว่าถูกต้องไหม
- ดู Response Status (200 = OK, 404 = Not Found, 500 = Server Error)
- ดู Response Body มี error message ไหม
```

### 2. ดู Console Log ใน Backend
```bash
# Backend จะ log ทุก request
2024-01-15T10:30:00.000Z - GET /sample-tenant/consent - IP: ::1
2024-01-15T10:30:01.000Z - POST /api/consent/version - IP: ::1
```

### 3. ตรวจสอบ CORS
```javascript
// ถ้าเจอ CORS error ให้ตรวจสอบใน server.js
app.use(cors({
  origin: ['http://localhost:3001'], // ต้องมี port 3001
  credentials: true
}));
```

---

## 📊 ตัวอย่าง Request/Response

### 1. Get Tenant Config
**Request:**
```http
GET /sample-tenant/consent
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "code": "sample-tenant",
      "name": "Sample Company",
      "defaultLanguage": "th"
    },
    "audiences": [
      {"code": "customer", "name": "ลูกค้า"},
      {"code": "employee", "name": "พนักงาน"}
    ],
    "languages": ["th", "en"]
  }
}
```

### 2. Submit Consent
**Request:**
```http
POST /api/consent/accept
Content-Type: application/json

{
  "tenant": "sample-tenant",
  "policyVersionId": 1,
  "audience": "customer",
  "language": "th",
  "title": "นาย",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "idType": "national_id",
  "idNumber": "1234567890123",
  "email": "somchai@example.com",
  "phone": "0812345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent submitted successfully",
  "data": {
    "consentRef": "CN1A2B3C4D5",
    "acceptedAt": "2024-01-15T10:30:00Z",
    "idLast4": "0123"
  }
}
```

### 3. Export Consents (CSV)
**Request:**
```http
GET /api/admin/reports/consents?format=csv&tenant=sample-tenant&startDate=2024-01-01
```

**Response:**
```csv
"Consent Reference","Tenant","Policy Type","Policy Version","First Name","Last Name","Accepted Date"
"CN1A2B3C4D5","Sample Company","privacy","1.0.0","สมชาย","ใจดี","2024-01-15T10:30:00Z"
```

---

## 🛠️ Script แก้ไข Frontend อัตโนมัติ

สร้างไฟล์ `fix-frontend-apis.js`:
```javascript
const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'src/pages/AdminConsentDashboard.js',
    replacements: [
      {
        old: '/tenant-policy/statistics',
        new: '/admin/reports/statistics'
      },
      {
        old: '/tenant-consent/list',
        new: '/admin/reports/consents'
      },
      {
        old: '/export/${format}',
        new: '/admin/reports/consents?format=${format}'
      }
    ]
  },
  {
    file: 'src/pages/AdminPolicyManager.js',
    replacements: [
      {
        old: "'/api/policy-versions'",
        new: "'/api/admin/policy-versions'"
      }
    ]
  }
];

fixes.forEach(({file, replacements}) => {
  const filePath = path.join(__dirname, '..', 'consent', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  replacements.forEach(({old, new: newStr}) => {
    content = content.replace(new RegExp(old, 'g'), newStr);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${file}`);
});

console.log('🎉 All API endpoints updated!');
```

รัน: `node fix-frontend-apis.js`

---

## ✅ Checklist การตรวจสอบ

- [ ] Backend รันที่ port 3000
- [ ] Frontend รันที่ port 3001
- [ ] Database PostgreSQL รันและมีตาราง
- [ ] Migration รันสำเร็จ
- [ ] Frontend เรียก API endpoint ถูกต้อง
- [ ] CORS settings อนุญาต localhost:3001
- [ ] Environment variables ตั้งค่าถูกต้อง
- [ ] ทดสอบ User Flow (ให้ความยินยอม)
- [ ] ทดสอบ Admin Dashboard (ดูสถิติ)
- [ ] ทดสอบ Policy Manager (จัดการ version)
- [ ] ทดสอบ Export CSV/JSON
- [ ] ทดสอบ Audit Logs
