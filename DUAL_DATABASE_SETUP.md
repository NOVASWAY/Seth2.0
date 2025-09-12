# 🗄️ Dual Database Setup - PostgreSQL + MongoDB

This document explains the dual database implementation in the Seth Clinic CMS system.

## 📋 Overview

The system now uses both **PostgreSQL** and **MongoDB** databases for different types of data:

### PostgreSQL (Relational Data)
- User management and authentication
- Financial transactions and billing
- Structured clinical data (patients, visits, prescriptions)
- Inventory management
- Relational data with foreign keys

### MongoDB (Document Data)
- Unstructured clinical data (lab results, medical images metadata)
- Analytics and reporting data
- Audit logs and detailed tracking
- Document metadata for file storage
- Real-time sync events

## 🚀 Quick Start

### 1. Environment Variables

Add these environment variables to your `.env` file:

```bash
# PostgreSQL (existing)
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/seth_clinic

# MongoDB (new)
MONGODB_URL=mongodb://admin:admin123@localhost:27017/seth_clinic_mongo?authSource=admin

# Redis (existing)
REDIS_URL=redis://localhost:6380
```

### 2. Start the Services

```bash
# Start all services including MongoDB
docker-compose up -d

# Check service health
docker-compose ps
```

### 3. Test Database Connections

```bash
# Test both databases
cd backend
npm run test:databases
```

## 🏗️ Architecture

### Database Service

The `DatabaseService` manages both database connections:

```typescript
import { databaseService } from './services/DatabaseService'

// Initialize both databases
await databaseService.initialize()

// Query PostgreSQL
const result = await databaseService.queryPostgreSQL('SELECT * FROM users')

// Get MongoDB collection
const collection = databaseService.getMongoCollection('clinical_data')

// Get MongoDB model
const ClinicalData = databaseService.getMongoModel('ClinicalData')
```

### MongoDB Models

Located in `backend/src/models/mongodb/`:

- **ClinicalData**: Unstructured medical data
- **Analytics**: User behavior and system analytics
- **AuditLog**: Detailed audit trails
- **DocumentMetadata**: File storage metadata
- **SyncEvent**: Real-time synchronization events

## 📊 Data Distribution

### PostgreSQL Tables
- `users` - User accounts and authentication
- `patients` - Patient information
- `visits` - Patient visits
- `prescriptions` - Medication prescriptions
- `invoices` - Financial invoices
- `payments` - Payment records
- `inventory` - Stock management
- `lab_requests` - Lab test requests

### MongoDB Collections
- `clinical_data` - Lab results, vital signs, symptoms
- `analytics` - User behavior tracking
- `audit_logs` - Detailed system audit trails
- `document_metadata` - File upload metadata
- `sync_events` - Real-time sync events

## 🔧 Usage Examples

### Storing Clinical Data in MongoDB

```typescript
import { ClinicalData } from './models/mongodb/ClinicalData'

// Store lab results
const labResult = new ClinicalData({
  patient_id: 'patient-123',
  data_type: 'lab_result',
  data: {
    test_name: 'Complete Blood Count',
    results: {
      hemoglobin: 14.2,
      white_blood_cells: 7500,
      platelets: 250000
    },
    reference_ranges: {
      hemoglobin: { min: 12.0, max: 16.0 },
      white_blood_cells: { min: 4000, max: 11000 }
    }
  },
  created_by: 'user-456',
  metadata: {
    lab_name: 'Central Lab',
    technician: 'Dr. Smith'
  }
})

await labResult.save()
```

### Storing Analytics in MongoDB

```typescript
import { Analytics } from './models/mongodb/Analytics'

// Track user actions
const analytics = new Analytics({
  event_type: 'page_view',
  user_id: 'user-123',
  data: {
    page: '/patients',
    duration: 45,
    actions: ['search', 'filter', 'view_patient']
  },
  session_id: 'session-789',
  ip_address: '192.168.1.100'
})

await analytics.save()
```

### Querying Both Databases

```typescript
// Get patient from PostgreSQL
const patient = await databaseService.queryPostgreSQL(
  'SELECT * FROM patients WHERE id = $1',
  [patientId]
)

// Get clinical data from MongoDB
const clinicalData = await ClinicalData.find({ patient_id: patientId })
  .sort({ created_at: -1 })
  .limit(10)
```

## 🏥 Health Monitoring

### Health Check Endpoint

```bash
GET /api/sync/health
```

Returns status of both databases:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "postgres": {
      "connected": true,
      "status": "healthy"
    },
    "mongodb": {
      "connected": true,
      "status": "healthy"
    },
    "websocket": "connected",
    "api": "healthy"
  },
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

## 🔍 MongoDB Collections Schema

### Clinical Data
```javascript
{
  patient_id: String,           // Reference to PostgreSQL patient
  data_type: String,            // lab_result, imaging, vital_signs, etc.
  data: Object,                 // Flexible clinical data
  metadata: Object,             // Additional metadata
  created_at: Date,
  updated_at: Date,
  created_by: String            // User ID from PostgreSQL
}
```

### Analytics
```javascript
{
  event_type: String,           // page_view, click, search, etc.
  user_id: String,              // Reference to PostgreSQL user
  data: Object,                 // Event-specific data
  timestamp: Date,
  session_id: String,
  ip_address: String,
  user_agent: String,
  metadata: Object
}
```

### Audit Logs
```javascript
{
  action: String,               // create, update, delete, login, etc.
  user_id: String,              // Reference to PostgreSQL user
  entity_type: String,          // patient, visit, prescription, etc.
  entity_id: String,            // ID of affected entity
  changes: Object,              // What changed
  timestamp: Date,
  ip_address: String,
  user_agent: String,
  metadata: Object
}
```

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check MongoDB container
   docker logs seth-clinic-mongodb
   
   # Restart MongoDB
   docker-compose restart mongodb
   ```

2. **PostgreSQL Connection Failed**
   ```bash
   # Check PostgreSQL container
   docker logs seth-clinic-db
   
   # Restart PostgreSQL
   docker-compose restart postgres
   ```

3. **Database Service Not Initialized**
   ```bash
   # Check server logs
   docker logs seth-clinic-backend
   
   # Restart backend
   docker-compose restart backend
   ```

### Testing Connections

```bash
# Test both databases
cd backend
npm run test:databases

# Check health endpoint
curl http://localhost:5000/api/sync/health
```

## 📈 Performance Considerations

### Indexing Strategy

**PostgreSQL**: Uses existing indexes on primary keys and foreign keys

**MongoDB**: Compound indexes for common query patterns:
- `{ patient_id: 1, data_type: 1 }`
- `{ user_id: 1, timestamp: -1 }`
- `{ event_type: 1, timestamp: -1 }`

### Data Archiving

- **PostgreSQL**: Keep all relational data
- **MongoDB**: Archive old analytics and audit logs after 1 year

## 🔐 Security

### Database Access

- **PostgreSQL**: Uses connection pooling with limited connections
- **MongoDB**: Uses authentication with application-specific user
- **Network**: Both databases are in isolated Docker network

### Data Encryption

- **At Rest**: Both databases support encryption
- **In Transit**: TLS/SSL connections
- **Application**: Sensitive data encrypted before storage

## 📚 Next Steps

1. **Data Migration**: Migrate existing unstructured data to MongoDB
2. **Analytics Dashboard**: Build analytics using MongoDB data
3. **Real-time Features**: Enhance real-time sync using MongoDB
4. **Backup Strategy**: Implement backup for both databases
5. **Monitoring**: Add database performance monitoring

## 🤝 Contributing

When adding new features:

1. **Relational Data** → Use PostgreSQL
2. **Unstructured Data** → Use MongoDB
3. **Analytics/Logs** → Use MongoDB
4. **File Metadata** → Use MongoDB
5. **User/Financial Data** → Use PostgreSQL

Always update the health check and add appropriate indexes for new MongoDB collections.
