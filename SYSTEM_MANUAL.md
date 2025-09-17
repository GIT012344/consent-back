# คู่มือระบบ Consent Management System
## 🎯 ภาพรวมระบบ

ระบบจัดการความยินยอม (Consent Management) สำหรับองค์กร รองรับหลาย tenant, หลายภาษา, หลายกลุ่มผู้ใช้

### 🔗 URL หลัก
- **User Consent**: `/{tenant}/consent` (เช่น `/default/consent`)
- **Admin Dashboard**: `/admin`
- **Policy Manager**: `/admin/policy-manager`

---

## 📊 Database Schema

### ตารางหลัก
1. **tenants** - องค์กรลูกค้า
2. **policy_kinds** - ประเภทนโยบาย (privacy, tos, marketing)
3. **policies** - นโยบายหลัก
4. **policy_versions** - เวอร์ชันนโยบาย
5. **audiences** - กลุ่มผู้ใช้ (customer, staff, partner, admin)
6. **policy_version_audiences** - mapping เวอร์ชัน-กลุ่มผู้ใช้
7. **user_consents** - บันทึกการยินยอม
8. **audit_logs** - ประวัติการเปลี่ยนแปลง

---

## 👨‍💼 Admin Flow - Policy Manager

### 1️⃣ เข้าหน้า Policy Manager (`/admin/policy-manager`)

**สิ่งที่เห็น:**
- ตารางแสดง Policy Versions ทั้งหมด
- Columns: Tenant | Kind | Version | Language | Audiences | Effective From-To | Status | Actions
- ปุ่ม "Create Policy Version" มุมขวาบน

### 2️⃣ สร้าง Policy Version ใหม่

**กด "Create Policy Version" → Modal แสดงฟอร์ม:**

| Field | Required | ค่า/ตัวอย่าง | บันทึกใน DB |
|-------|----------|-------------|-------------|
| **Tenant** | ✅ | Dropdown: default, company1, etc. | `policy_versions.tenant_id` |
| **Policy Kind** | ✅ | privacy / tos / marketing | `policy_versions.kind` |
| **Version** | ✅ | 1.0.0 (SemVer) | `policy_versions.version` |
| **Language** | ✅ | th / en | `policy_versions.language` |
| **Target Audiences** | ✅ | ☑ Customer ☑ Staff ☐ Partner | `policy_version_audiences` |
| **Title** | ✅ | นโยบายความเป็นส่วนตัว v1.0 | `policy_versions.title` |
| **Content** | ✅ | HTML/Markdown editor | `policy_versions.content_html` |
| **Effective From** | ✅ | 2024-01-01 09:00 | `policy_versions.effective_from` |
| **Effective To** | ⚪ | 2024-12-31 23:59 | `policy_versions.effective_to` |
| **Is Mandatory** | ✅ | ☑ บังคับยินยอม | `policy_versions.is_mandatory` |
| **Grace Days** | ⚪ | 7 (วันผ่อนผัน) | `policy_versions.grace_days` |
| **Enforce Mode** | ✅ | login_gate / action_gate / public | `policy_versions.enforce_mode` |

**Validation:**
- ✅ เวอร์ชันไม่ซ้ำใน tenant+kind+language
- ✅ ต้องเลือก audience อย่างน้อย 1
- ✅ Effective To > Effective From
- ✅ ถ้า Mandatory ต้องเลือก Enforce Mode

### 3️⃣ หลัง Publish แล้ว

**ไปที่ Admin Dashboard → Consent Dashboard:**
- **Cards แสดงสถิติ:**
  - Total Accepted: จำนวนผู้ยินยอมทั้งหมด
  - Pending: รอการยินยอม
  - Acceptance Rate: % การยอมรับ
- **Filter:**
  - Tenant / Kind / Version / Audience / Language / Date Range
- **Export:** CSV / Excel พร้อมฟิลด์ครบ

---

## 👤 User Flow - Consent Page

### 🌐 URL: `/{tenant}/consent`

### Step A: เลือกประเภทผู้ใช้ (ถ้ามีหลาย audience)
```
คุณคือ:
○ ลูกค้าทั่วไป (Customer)
○ พนักงาน (Staff)  
○ พาร์ทเนอร์ (Partner)
```
**Logic:** ถ้า tenant มีแค่ 1 audience → ข้ามขั้นนี้

### Step B: เลือกภาษา
```
🇹🇭 ไทย | 🇬🇧 English
```
**Default:** ตาม browser language (Accept-Language header)

### Step C: แสดงเนื้อหา Consent

**ระบบเลือกเวอร์ชันด้วยเกณฑ์:**
1. `effective_from <= NOW() < effective_to`
2. ครอบคลุม audience ที่เลือก
3. ภาษาตรงกับที่เลือก
4. เอาล่าสุด (ORDER BY effective_from DESC)

**แสดง:**
- Title: นโยบายความเป็นส่วนตัว
- Content: เนื้อหา HTML (scrollable)
- Checkbox: ☐ ฉันได้อ่านและยอมรับเงื่อนไข

### Step D: กรอกข้อมูลผู้ยินยอม

| Field | Validation | ตัวอย่าง |
|-------|------------|----------|
| **คำนำหน้า** | Required | นาย/นาง/นางสาว |
| **ชื่อ-นามสกุล** | TH: ก-ฮ, EN: A-Z | สมชาย ใจดี |
| **เลขบัตรประชาชน** | 13 หลัก + checksum | 1234567890123 |
| **อีเมล** | Email format (optional) | somchai@email.com |
| **เบอร์โทร** | 9-10 หลัก (optional) | 0812345678 |

**Security:**
- ID → SHA256 hash + เก็บ last4
- บันทึก IP, User-Agent
- Snapshot HTML ที่ user เห็น

### Step E: หน้าสำเร็จ

**แสดง:**
```
✅ บันทึกความยินยอมสำเร็จ
Consent ID: CN2024ABC123
วันที่: 25/01/2024 14:30:45

[พิมพ์] [ดาวน์โหลด PDF] [ส่งอีเมล]
```

---

## 📊 Report & Export

### CSV Export Fields
```sql
SELECT
  uc.title AS "Title",
  CONCAT(uc.first_name,' ',uc.last_name) AS "Name-Surname",
  CONCAT(UPPER(uc.id_type),' ****',uc.id_last4) AS "ID",
  DATE(uc.accepted_at AT TIME ZONE 'Asia/Bangkok') AS "Created Date",
  TO_CHAR(uc.accepted_at AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS') AS "Created Time",
  uc.consent_ref AS "Consent ID",
  INITCAP(uc.audience) AS "ConsentType",
  UPPER(uc.lang) AS "Consent Language",
  uc.ip_addr AS "IP Address",
  uc.user_agent AS "Browser"
FROM user_consents uc
WHERE uc.tenant_id = :tenant_id
ORDER BY uc.accepted_at DESC;
```

---

## 🔄 API Endpoints

### Admin APIs
- `GET /api/admin/tenants` - รายการ tenants
- `GET /api/admin/policy-versions` - รายการ versions
- `POST /api/admin/policy-versions` - สร้าง version ใหม่
- `PUT /api/admin/policy-versions/:id/publish` - publish version
- `GET /api/admin/statistics` - สถิติ consent
- `GET /api/admin/consents` - รายการ consents
- `POST /api/admin/export` - export data (CSV/JSON)

### User APIs
- `GET /api/tenant/:code/config` - config ของ tenant
- `POST /api/consent/version` - ดึง active version
- `POST /api/consent/accept` - บันทึกการยินยอม
- `GET /api/consent/check/:id` - ตรวจสอบสถานะ

---

## ⚠️ เคสพิเศษ

### 1. Re-consent (ยินยอมใหม่)
- ถ้ามีเวอร์ชันใหม่ + mandatory → บังคับยินยอมใหม่
- เก็บประวัติเก่าไว้ใน audit

### 2. Grace Period
- ถ้าตั้ง grace_days = 7 → ใช้งานต่อได้ 7 วัน
- หลังจากนั้นบังคับยินยอม

### 3. Enforce Mode
- **login_gate**: เช็คตอน login
- **action_gate**: เช็คก่อนทำ action สำคัญ
- **public**: ไม่บังคับ (แค่แสดง)

### 4. Multi-language
- สร้าง version แยกตามภาษา
- เลขเวอร์ชันเดียวกันได้ ต่างภาษา

---

## 🚀 การติดตั้งและรันระบบ

### Backend (Port 3000)
```bash
cd consent-back
npm install
node server.js
# หรือ
start-server.bat
```

### Frontend (Port 3001)
```bash
cd consent
npm install
npm start
```

### Database
- PostgreSQL: `postgres:4321@localhost:5432/consent`
- Migration: `node migrations/run-migration.js`

---

## ✅ Checklist ก่อนใช้งานจริง

### Admin
- [ ] Preview content ก่อน publish
- [ ] ตั้งเวลา scheduled publish
- [ ] Clone version เก่าได้
- [ ] Export report ครบถ้วน

### User
- [ ] URL: `/{tenant}/consent`
- [ ] Auto-detect language
- [ ] Validate เลขบัตร 13 หลัก
- [ ] Hash ID + keep last4
- [ ] Show Consent ID หลังบันทึก
- [ ] Print/Download PDF

### Security
- [ ] ไม่เก็บเลขบัตรเต็ม
- [ ] HTTPS only
- [ ] Rate limiting
- [ ] CORS configuration

---

## 📞 Support
- Email: support@consent-system.com
- Documentation: /docs
- API Docs: /api-docs
