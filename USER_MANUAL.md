# 📘 คู่มือการใช้งานระบบ Consent Management

## 🎯 สำหรับผู้ใช้งานทั่วไป (User)

### 1. การให้ความยินยอม (Consent Flow)

#### ขั้นตอนที่ 1: เข้าหน้าให้ความยินยอม
```
URL: http://localhost:3001/{tenant-name}/consent
ตัวอย่าง: http://localhost:3001/sample-tenant/consent
```

#### ขั้นตอนที่ 2: เลือกภาษาและกลุ่มผู้ใช้
- **ภาษา**: ไทย / English
- **กลุ่มผู้ใช้**: 
  - Customer (ลูกค้า)
  - Employee (พนักงาน)  
  - Partner (พันธมิตร)

#### ขั้นตอนที่ 3: กรอกข้อมูลส่วนตัว
```
- คำนำหน้า: นาย/นาง/นางสาว
- ชื่อ-นามสกุล
- ประเภทเอกสาร: บัตรประชาชน/พาสปอร์ต
- หมายเลขเอกสาร
- อีเมล (ไม่บังคับ)
- เบอร์โทร (ไม่บังคับ)
```

#### ขั้นตอนที่ 4: อ่านและยอมรับนโยบาย
- อ่านนโยบายความเป็นส่วนตัว
- คลิก ✅ ยอมรับเงื่อนไข
- กด "ส่งข้อมูล"

#### ขั้นตอนที่ 5: รับหมายเลขอ้างอิง
```
ตัวอย่าง: CN1A2B3C4D5
⚠️ กรุณาเก็บหมายเลขนี้ไว้เพื่อตรวจสอบสถานะ
```

### 2. การตรวจสอบสถานะความยินยอม

#### วิธีที่ 1: ใช้หมายเลขอ้างอิง
```
URL: http://localhost:3001/check
- ใส่หมายเลขอ้างอิง (เช่น CN1A2B3C4D5)
- กด "ตรวจสอบ"
```

#### วิธีที่ 2: ใช้หมายเลขบัตรประชาชน
```
API: GET /api/consent/history/{id-number}?tenant=sample-tenant
- ระบบจะแสดงประวัติการให้ความยินยอมทั้งหมด
```

---

## 👨‍💼 สำหรับผู้ดูแลระบบ (Admin)

### 1. การจัดการ Policy Version

#### 1.1 เข้าหน้า Admin
```
URL: http://localhost:3001/admin/policy-manager
Username: admin
Password: admin123
```

#### 1.2 สร้าง Policy Version ใหม่
1. คลิกปุ่ม "➕ Create New Version"
2. กรอกข้อมูล:
```yaml
Tenant: sample-tenant
Policy Type: privacy / terms / marketing
Version: 1.0.0 (ต้องเป็น x.y หรือ x.y.z)
Language: th / en
Title: ชื่อนโยบาย
Audiences: [customer, employee, partner]
Effective From: วันที่เริ่มใช้
Effective To: วันที่สิ้นสุด (ไม่บังคับ)
Is Mandatory: ✅ (บังคับให้ยอมรับ)
Grace Days: 7 (จำนวนวันผ่อนผัน)
```
3. อัพโหลดไฟล์ HTML หรือ PDF
4. กด "Save"

#### 1.3 แก้ไข Policy Version
1. คลิก "✏️ Edit" ที่ version ที่ต้องการ
2. แก้ไขข้อมูล (ยกเว้น tenant, kind, version, language)
3. กด "Update"

#### 1.4 เผยแพร่ Policy Version
1. คลิก "📢 Publish" ที่ version ที่ต้องการ
2. ยืนยันการเผยแพร่
3. ระบบจะ:
   - ปิด version เก่าที่ active อยู่
   - เปิด version ใหม่ให้ active

#### 1.5 ลบ Policy Version
- ลบได้เฉพาะ version ที่ยังไม่ publish
- คลิก "🗑️ Delete" และยืนยัน

### 2. การดู Dashboard และ Reports

#### 2.1 Dashboard สถิติ
```
URL: http://localhost:3001/admin/dashboard
แสดง:
- จำนวน consent ทั้งหมด
- จำนวน consent วันนี้/สัปดาห์นี้/เดือนนี้
- แยกตาม version/audience/language
```

#### 2.2 Export ข้อมูล Consent
```
URL: /api/admin/reports/consents?format=csv
Parameters:
- tenant: รหัส tenant
- startDate: วันที่เริ่ม (YYYY-MM-DD)
- endDate: วันที่สิ้นสุด (YYYY-MM-DD)
- audience: customer/employee/partner
- language: th/en
- format: json/csv
```

ตัวอย่าง:
```bash
curl "http://localhost:3000/api/admin/reports/consents?tenant=sample-tenant&format=csv&startDate=2024-01-01" > consents.csv
```

#### 2.3 ดู Compliance Report
```
URL: /api/admin/reports/compliance?tenant=sample-tenant
แสดง:
- Policy ที่บังคับ (mandatory)
- จำนวนผู้ที่ยอมรับแล้ว
- สถานะ grace period
```

#### 2.4 ดู Audit Log
```
URL: /api/admin/reports/audit-trail
แสดง:
- การสร้าง/แก้ไข/ลบ policy version
- ผู้ทำ, เวลา, IP address
- การเปลี่ยนแปลงที่เกิดขึ้น
```

### 3. การทดสอบ API ด้วย Postman

#### 3.1 Import Collection
```json
{
  "info": {
    "name": "Consent Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "User Flow",
      "item": [
        {
          "name": "Get Tenant Config",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/sample-tenant/consent"
          }
        },
        {
          "name": "Get Active Policy",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/consent/version",
            "body": {
              "mode": "raw",
              "raw": {
                "tenant": "sample-tenant",
                "kind": "privacy",
                "audience": "customer",
                "language": "th"
              }
            }
          }
        },
        {
          "name": "Submit Consent",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/consent/accept",
            "body": {
              "mode": "raw",
              "raw": {
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
            }
          }
        }
      ]
    },
    {
      "name": "Admin APIs",
      "item": [
        {
          "name": "List Policy Versions",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/admin/policy-versions?tenant=sample-tenant"
          }
        },
        {
          "name": "Create Policy Version",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/admin/policy-versions",
            "body": {
              "mode": "formdata",
              "formdata": [
                {"key": "tenant", "value": "sample-tenant"},
                {"key": "kind", "value": "privacy"},
                {"key": "version", "value": "1.0.0"},
                {"key": "locale", "value": "th"},
                {"key": "title", "value": "นโยบายความเป็นส่วนตัว"},
                {"key": "audiences", "value": "[\"customer\"]"},
                {"key": "file", "type": "file", "src": "policy.html"}
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

#### 3.2 ตั้งค่า Environment
```
Base URL: http://localhost:3000
Headers:
- Content-Type: application/json
- Accept: application/json
```

### 4. การแก้ปัญหาที่พบบ่อย

#### ❌ Error: "Tenant not found"
```bash
# ตรวจสอบว่ามี tenant ในระบบ
SELECT * FROM tenants;

# เพิ่ม tenant ใหม่
INSERT INTO tenants (tenant_code, tenant_name, default_language) 
VALUES ('your-tenant', 'Your Company', 'th');
```

#### ❌ Error: "No active policy found"
```bash
# ตรวจสอบ policy versions
SELECT * FROM policy_versions WHERE tenant = 'your-tenant' AND is_published = true;

# Publish version
UPDATE policy_versions SET is_published = true 
WHERE id = 1;
```

#### ❌ Error: "Database connection failed"
```bash
# ตรวจสอบ .env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=consent
DB_USER=postgres
DB_PASSWORD=4321

# รัน migration
cd consent-back
node migrations/run-migrations.js
```

### 5. คำสั่งสำคัญ

#### เริ่มระบบ
```bash
# Backend (Port 3000)
cd consent-back
npm install
npm run dev

# Frontend (Port 3001)
cd consent
npm install
npm start
```

#### ทดสอบ API
```bash
# Test backend
cd consent-back
node test-backend.js

# Check health
curl http://localhost:3000/health
```

#### Database Commands
```bash
# Connect to PostgreSQL
psql -U postgres -d consent

# View tables
\dt

# View consent records
SELECT * FROM user_consents ORDER BY accepted_at DESC LIMIT 10;

# View policy versions
SELECT * FROM policy_versions WHERE tenant = 'sample-tenant';
```

---

## 📊 โครงสร้างข้อมูลสำคัญ

### User Consent Record
```json
{
  "consentRef": "CN1A2B3C4D5",
  "tenant": "sample-tenant",
  "policyVersionId": 1,
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "idLast4": "0123",
  "acceptedAt": "2024-01-15T10:30:00Z"
}
```

### Policy Version
```json
{
  "id": 1,
  "tenant": "sample-tenant",
  "kind": "privacy",
  "version": "1.0.0",
  "locale": "th",
  "title": "นโยบายความเป็นส่วนตัว",
  "audiences": ["customer"],
  "isPublished": true,
  "effectiveFrom": "2024-01-01",
  "isMandatory": true,
  "graceDays": 7
}
```

---

## 🔐 Security Notes

1. **ID Hashing**: หมายเลขบัตรประชาชนถูก hash ด้วย SHA-256
2. **Audit Logs**: ทุกการเปลี่ยนแปลงถูกบันทึกใน audit_logs
3. **Rate Limiting**: จำกัด 100 requests ต่อ 15 นาที
4. **CORS**: อนุญาตเฉพาะ domain ที่กำหนด

---

## 📞 ติดต่อสอบถาม

หากพบปัญหาหรือต้องการความช่วยเหลือ:
- 📧 Email: admin@consent-system.com
- 📱 Line: @consent-support
- 📚 Docs: http://localhost:3001/docs
