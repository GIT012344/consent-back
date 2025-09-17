# Consent Management System - Test Guide

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd c:\Users\jchayapol\consent-back
node consent-server.js
```
Server will run on: http://localhost:3000

### 2. Start Frontend
```bash
cd c:\Users\jchayapol\consent
npm start
```
Frontend will run on: http://localhost:3003

## ✅ System Status

### Fixed Issues:
- ✅ Error 431 (Request Header Fields Too Large) - Fixed with header minimization
- ✅ Error 500 on /api/simple-policy - Fixed with proper route handling
- ✅ Error 400 on /api/consent submission - Fixed with field validation
- ✅ Admin UI cleaned up - Removed unused routes
- ✅ Backend routes simplified - Removed problematic imports

### Working Endpoints:
- GET /health - Server health check
- POST /api/consent - Submit consent (handles database or memory storage)
- GET /api/simple-policy/list - List all policies
- GET /api/simple-policy/active?userType=customer&language=th-TH - Get active policy
- POST /api/simple-policy - Create new policy

## 🧪 Test Scenarios

### Test 1: Submit Consent
1. Open frontend: http://localhost:3003
2. Fill in the consent form:
   - Name: Test
   - Surname: User
   - ID/Passport: 1234567890123
   - Email: test@example.com
   - Phone: 0812345678
3. Submit and verify success message

### Test 2: Create Policy (Admin)
1. Go to Admin Dashboard
2. Create Single Policy
3. Fill in:
   - Version: 1.0.0
   - Language: Thai (th-TH)
   - User Type: Customer
   - Title: นโยบายความเป็นส่วนตัว
   - Content: Policy content here
4. Submit and verify creation

### Test 3: Check Active Policy
1. The system will automatically fetch active policy
2. Verify it displays correctly in consent form

## 🔧 Troubleshooting

### If Backend Won't Start:
1. Check if port 3000 is in use:
   ```bash
   netstat -an | findstr :3000
   ```
2. Kill any existing node processes:
   ```bash
   taskkill /F /IM node.exe
   ```
3. Try the simple server:
   ```bash
   node consent-server.js
   ```

### If Frontend Has Errors:
1. Clear browser storage:
   - Open DevTools (F12)
   - Application tab
   - Clear Storage
2. Refresh page (Ctrl+F5)

### If Database Connection Fails:
- The system will automatically fall back to in-memory storage
- Data will be lost on server restart but system will continue working

## 📝 Important Notes

1. **Header Size Management**: The system automatically limits request headers to prevent 431 errors
2. **Storage Cleanup**: Browser storage is automatically cleared if it exceeds limits
3. **Database Fallback**: If PostgreSQL is unavailable, the system uses in-memory storage
4. **CORS**: Backend accepts requests from ports 3000, 3001, and 3003

## 🎯 Current Configuration

- Backend Port: 3000
- Frontend Port: 3003
- Database: PostgreSQL (localhost:5432/consent)
- Database User: postgres
- Database Password: 4321

## 📊 System Architecture

```
Frontend (React)          Backend (Express)         Database (PostgreSQL)
localhost:3003     -->    localhost:3000      -->   localhost:5432
                          |                         |
                          ├─ /api/consent          ├─ consent_records
                          ├─ /api/simple-policy    ├─ policy_versions
                          └─ /health               └─ policies
```

## ✨ Ready for Testing!

The system is now stable and ready for comprehensive testing. All critical errors have been resolved.
