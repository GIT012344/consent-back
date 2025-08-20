# Consent Management API Documentation

## Overview
The Consent Management API provides comprehensive endpoints for managing user consent, admin operations, version control, and audit logging.

**Base URL**: `http://localhost:3000/api`  
**API Version**: 2.0.0

## Authentication
Admin endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- General API: 100 requests per 15 minutes
- Consent submission: 10 requests per 15 minutes  
- Login: 5 attempts per 15 minutes
- Export: 10 requests per 5 minutes
- Upload: 20 requests per hour

## Endpoints

### Health Check

#### GET /api/health
Basic health check
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "database": {
    "connected": true,
    "time": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/health/detailed
Detailed system health with metrics
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "system": {
    "platform": "win32",
    "cpus": 8,
    "memory": {
      "total": "16.00 GB",
      "free": "8.00 GB",
      "usage": "50.00%"
    }
  },
  "database": {
    "connected": true,
    "stats": {
      "totalUsers": 1000,
      "totalConsents": 1500,
      "totalVersions": 5,
      "totalAdmins": 3
    }
  }
}
```

### Public Consent Endpoints

#### POST /api/v2/consent/initial
Initial consent registration with basic info
- **Request Body**:
```json
{
  "title": "นาย",
  "fullName": "สมชาย ใจดี"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "referenceNumber": "CNS-20240115-001"
  }
}
```

#### POST /api/v2/consent/submit
Full consent submission
- **Request Body**:
```json
{
  "title": "นาย",
  "fullName": "สมชาย ใจดี",
  "idPassport": "1234567890123",
  "email": "somchai@example.com",
  "phone": "0812345678",
  "consentGiven": true,
  "consentVersionId": 1,
  "language": "th"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "consentId": 456,
    "referenceNumber": "CNS-20240115-002",
    "consentVersion": "2.0"
  }
}
```

#### GET /api/v2/consent/check/:idPassport
Check consent status by ID/Passport
- **Parameters**: 
  - `idPassport`: Thai ID (13 digits) or Passport number
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "hasConsent": true,
    "consents": [
      {
        "id": 456,
        "consentGiven": true,
        "consentDate": "2024-01-15T10:00:00Z",
        "version": "2.0",
        "status": "active"
      }
    ]
  }
}
```

#### GET /api/v2/consent/active-version
Get currently active consent version
- **Query Parameters**:
  - `language`: "th" or "en" (default: "th")
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "version": "2.0",
    "language": "th",
    "description": "เวอร์ชันล่าสุด",
    "content": "ข้อความยินยอม...",
    "isActive": true
  }
}
```

#### GET /api/v2/consent/targeted-version/:idPassport
Get targeted consent version for specific user
- **Parameters**:
  - `idPassport`: Thai ID or Passport number
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "hasTargeted": true,
    "version": {
      "id": 2,
      "version": "2.1",
      "language": "th",
      "description": "เวอร์ชันพิเศษ"
    }
  }
}
```

### Admin Authentication

#### POST /api/admin/login
Admin login
- **Request Body**:
```json
{
  "username": "admin",
  "password": "password123"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super_admin"
  }
}
```

#### POST /api/admin/logout
Admin logout (requires auth)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "ออกจากระบบเรียบร้อย"
}
```

#### GET /api/admin/profile
Get admin profile (requires auth)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "lastLogin": "2024-01-15T09:00:00Z"
  }
}
```

#### POST /api/admin/change-password
Change admin password (requires auth)
- **Request Body**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "เปลี่ยนรหัสผ่านเรียบร้อย"
}
```

### Admin Management

#### GET /api/admin/stats
Dashboard statistics (requires auth)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totalConsents": 1500,
    "todayConsents": 50,
    "activeConsents": 1400,
    "withdrawnConsents": 100,
    "consentsByLanguage": {
      "th": 1200,
      "en": 300
    },
    "recentActivity": [...]
  }
}
```

#### GET /api/admin/consents
List consents with pagination (requires auth)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
  - `search`: Search term for name/ID
  - `status`: Filter by status (active/withdrawn)
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "totalPages": 10,
    "total": 500,
    "limit": 50
  }
}
```

#### PUT /api/admin/consents/:id/withdraw
Withdraw a consent (requires auth)
- **Parameters**:
  - `id`: Consent ID
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "ถอนความยินยอมเรียบร้อย"
}
```

### Consent Version Management

#### POST /api/v2/upload/consent-version
Upload new consent version (requires auth)
- **Form Data**:
  - `file`: Consent document file (PDF, DOC, DOCX, TXT)
  - `version`: Version number (e.g., "2.0")
  - `language`: Language code ("th" or "en")
  - `description`: Optional description
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 3,
    "version": "2.0",
    "fileName": "consent-v2.0.pdf"
  }
}
```

#### GET /api/v2/upload/consent-versions
List all consent versions (requires auth)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "version": "1.0",
      "language": "th",
      "description": "เวอร์ชันแรก",
      "isActive": false,
      "fileName": "consent-v1.0.pdf",
      "fileSize": "245KB",
      "usageCount": 500,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/v2/upload/consent-version/:id
Get consent version details (requires auth)
- **Parameters**:
  - `id`: Version ID
- **Response**: `200 OK`

#### PUT /api/v2/upload/consent-version/:id/toggle
Toggle version active status (requires auth)
- **Parameters**:
  - `id`: Version ID
- **Response**: `200 OK`

#### GET /api/v2/upload/consent-version/:id/download
Download consent version file (requires auth)
- **Parameters**:
  - `id`: Version ID
- **Response**: File download

#### DELETE /api/v2/upload/consent-version/:id
Delete consent version (requires auth)
- **Parameters**:
  - `id`: Version ID
- **Response**: `200 OK`

### Version Targeting

#### POST /api/consent/version-targeting
Create version targeting (requires auth)
- **Request Body**:
```json
{
  "idPassport": "1234567890123",
  "consentVersionId": 2,
  "startDate": "2024-01-15",
  "endDate": "2024-12-31"
}
```
- **Response**: `201 Created`

#### GET /api/consent/version-targeting
List all version targeting (requires auth)
- **Query Parameters**:
  - `page`: Page number
  - `limit`: Items per page
  - `search`: Search ID/Passport
- **Response**: `200 OK`

#### PUT /api/consent/version-targeting/:id/toggle
Toggle targeting status (requires auth)
- **Parameters**:
  - `id`: Targeting ID
- **Response**: `200 OK`

#### DELETE /api/consent/version-targeting/:id
Delete version targeting (requires auth)
- **Parameters**:
  - `id`: Targeting ID
- **Response**: `200 OK`

#### POST /api/consent/version-targeting/bulk
Bulk create version targeting (requires auth)
- **Request Body**:
```json
{
  "idPassports": ["1234567890123", "9876543210987"],
  "consentVersionId": 2,
  "startDate": "2024-01-15",
  "endDate": "2024-12-31"
}
```
- **Response**: `201 Created`

### Export

#### GET /api/export/excel
Export consents to Excel
- **Query Parameters**:
  - `startDate`: Filter start date
  - `endDate`: Filter end date
  - `search`: Search term
  - `status`: Filter by status
- **Response**: Excel file download

#### GET /api/export/csv
Export consents to CSV
- **Query Parameters**: Same as Excel export
- **Response**: CSV file download

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request data",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 300
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Database Schema

### Main Tables:
- **users**: User personal information
- **consent_versions**: Consent document versions
- **consents**: User consent records
- **consent_version_targeting**: Targeted versions for specific users
- **admin_users**: Admin user accounts
- **audit_logs**: System audit trail

## Security Features

1. **JWT Authentication**: Secure token-based authentication for admin endpoints
2. **Password Hashing**: Bcrypt hashing for secure password storage
3. **Input Validation**: Comprehensive validation for all inputs
4. **SQL Injection Prevention**: Parameterized queries throughout
5. **XSS Protection**: Input sanitization and helmet.js
6. **Rate Limiting**: Protection against brute force and DoS attacks
7. **CORS**: Configurable cross-origin resource sharing
8. **Audit Logging**: Complete audit trail for all admin actions

## Environment Variables

Required environment variables in `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=consent_db

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=Admin@123456

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
```

## Development

### Running the Server

```bash
# Install dependencies
npm install

# Run with original server
npm start

# Run with enhanced v2 server
npm run start:v2

# Development mode with auto-restart
npm run dev:v2
```

### Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Admin login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}'
```

## Support

For issues or questions, please contact the development team.
