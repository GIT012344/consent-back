# Consent Management Backend API

A robust backend API for managing consent records with multi-language support, data export capabilities, and comprehensive record management.

## Features

- ✅ **Consent Submission**: Submit and store consent records
- ✅ **Duplicate Prevention**: Check for existing consent records
- ✅ **Multi-language Support**: Thai and English language support
- ✅ **Data Export**: Export to Excel and CSV formats
- ✅ **Search & Filter**: Advanced filtering and search capabilities
- ✅ **Statistics**: Comprehensive consent statistics and reporting
- ✅ **Security**: Rate limiting, input validation, and SQL injection protection
- ✅ **Database**: MySQL with connection pooling

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Export**: ExcelJS for Excel, CSV generation
- **Date Handling**: Moment.js

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd consent-back
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=consent_management
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Set up MySQL database**
   - Create a MySQL database named `consent_management`
   - The application will automatically create the required tables on first run

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Consent Management
- `POST /api/consent/submit` - Submit new consent record
- `GET /api/consent/check/:idPassport` - Check if consent exists
- `GET /api/consent/list` - Get paginated consent records with filters
- `GET /api/consent/stats` - Get consent statistics

### Data Export
- `GET /api/export/excel` - Export records to Excel format
- `GET /api/export/csv` - Export records to CSV format
- `GET /api/export/summary` - Get export statistics

## API Usage Examples

### Submit Consent
```bash
curl -X POST http://localhost:3000/api/consent/submit \
  -H "Content-Type: application/json" \
  -d '{
    "title": "นาย",
    "nameSurname": "สมชาย ใจดี",
    "idPassport": "1234567890123",
    "language": "th",
    "consentType": "customer"
  }'
```

### Check Existing Consent
```bash
curl http://localhost:3000/api/consent/check/1234567890123
```

### Get Consent List with Filters
```bash
curl "http://localhost:3000/api/consent/list?page=1&limit=10&search=สมชาย&type=customer&language=th"
```

### Export to Excel
```bash
curl "http://localhost:3000/api/export/excel?startDate=2024-01-01&endDate=2024-12-31" \
  --output consent_records.xlsx
```

## Database Schema

### consent_records
| Field | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Auto-increment primary key |
| title | VARCHAR(10) | Title (นาย, นาง, นางสาว, Mr., Mrs., Miss, Ms.) |
| name_surname | VARCHAR(255) | Full name |
| id_passport | VARCHAR(50) | ID card or passport number |
| created_date | DATETIME | Record creation date |
| created_time | TIME | Record creation time |
| ip_address | VARCHAR(45) | Client IP address |
| browser | VARCHAR(500) | User agent string |
| consent_type | VARCHAR(50) | Type of consent (customer, employee, partner) |
| consent_language | VARCHAR(10) | Language preference (th, en) |
| consent_version | VARCHAR(20) | Consent version |
| is_active | BOOLEAN | Record status |
| updated_at | TIMESTAMP | Last update timestamp |

### consent_versions
| Field | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Auto-increment primary key |
| version | VARCHAR(20) | Version identifier |
| content_th | TEXT | Thai consent content |
| content_en | TEXT | English consent content |
| is_active | BOOLEAN | Version status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

## Request/Response Examples

### Successful Consent Submission
```json
{
  "success": true,
  "message": "Consent submitted successfully",
  "data": {
    "id": 1,
    "submissionId": "uuid-here",
    "record": {
      "id": 1,
      "title": "นาย",
      "name_surname": "สมชาย ใจดี",
      "id_passport": "1234567890123",
      "created_date": "2024-01-15T10:30:00.000Z",
      "ip_address": "192.168.1.100",
      "consent_type": "customer",
      "consent_language": "th"
    }
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Name-Surname must be between 2 and 255 characters",
      "param": "nameSurname",
      "location": "body"
    }
  ]
}
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers and protection
- **Environment-based Configuration**: Sensitive data in environment variables

## Development

### Project Structure
```
consent-back/
├── config/
│   └── database.js          # Database configuration
├── routes/
│   ├── consent.js          # Consent management routes
│   └── export.js           # Data export routes
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (to be implemented)

## Frontend Integration

This backend is designed to work with a frontend application. Key integration points:

1. **CORS Configuration**: Update the CORS origins in `server.js` to match your frontend domain
2. **API Base URL**: Frontend should point to `http://localhost:3000/api` (or your production URL)
3. **Error Handling**: All endpoints return consistent JSON responses with `success` boolean
4. **File Downloads**: Export endpoints return files directly for download

## Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production database credentials
   - Set secure JWT secret
   - Configure production CORS origins

2. **Database Setup**
   - Ensure MySQL is properly configured
   - Set up database backups
   - Configure connection pooling limits

3. **Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Set up monitoring and logging
   - Regular security updates

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing process on port 3000

3. **CORS Errors**
   - Update CORS origins in `server.js`
   - Check frontend URL configuration

### Logs
The application logs all requests and errors to the console. In production, consider using a proper logging service.

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team.
