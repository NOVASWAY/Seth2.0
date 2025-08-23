# Seth Medical Clinic - Management System

A comprehensive, production-ready Clinic Management System designed specifically for Level 2 Kenyan Dispensaries. Built with modern technologies and integrated with M-Pesa payments and SHA insurance claims.

## 🏥 Features

### Core Functionality
- **Patient Management**: Complete patient registration with OP Number system
- **Queue Management**: Real-time patient flow tracking with drag-and-drop interface
- **Clinical Workflow**: Vitals recording, consultations, prescriptions, and lab management
- **Pharmacy & Inventory**: Batch tracking, expiry management, and automated dispensing
- **Financial Management**: Invoicing, payments, debt tracking, and reconciliation
- **SHA Claims**: Automated claim generation, batching, and submission
- **M-Pesa Integration**: Real-time payment processing and reconciliation

### 🆕 **NEW: Enhanced Prescription System**
- **Real-time Stock Integration**: Medicine dropdown shows only available stock with expiry warnings
- **Enhanced Patient Input**: Search existing patients or register new ones with comprehensive forms
- **Auto-Save Protection**: Forms automatically save every 30 seconds to prevent data loss
- **Draft Recovery**: Restore work after power outages or server downtime
- **Comprehensive Timestamping**: All records include creation and update timestamps
- **Smart Medicine Selection**: Search medicines by name, category, or generic name

### 🆕 **NEW: Enhanced SHA Insurance Management**

The system now includes comprehensive SHA insurance integration with automated invoice generation, compliance tracking, and audit trails:

#### Key Features:
- **Automated Invoice Generation**: Invoices are automatically generated for all SHA patients with proper service codes
- **Batch Management**: Weekly, monthly, and custom batch creation for organized claim submission
- **Printable Invoices**: Professional printable invoices meeting SHA requirements with clinic branding
- **Compliance Tracking**: Full audit trails and compliance monitoring for SHA requirements
- **Electronic Submission**: Direct API integration with SHA eClaims portal for seamless submission
- **Financial Reconciliation**: Track payments, reconcile claims, and manage accounts receivable
- **Audit Support**: Comprehensive record keeping with 7-year retention for SHA audits
- **Real-time Status**: Live tracking of claim status from submission to payment

### 🆕 **NEW: Enhanced Diagnostics System**
- **Real-time Test Catalog**: Laboratory test dropdown shows only active tests with pricing and turnaround times
- **Enhanced Patient Input**: Search existing patients or register new ones with comprehensive forms
- **Auto-Save Protection**: Forms automatically save every 30 seconds to prevent data loss
- **Draft Recovery**: Restore work after power outages or server downtime
- **Urgency Management**: Set priority levels (Routine/Urgent/STAT) with visual indicators
- **Comprehensive Timestamping**: All records include creation and update timestamps
- **Smart Test Selection**: Search tests by name, code, category, or description

### Security & Compliance
- **Role-Based Access Control (RBAC)**: 8 distinct user roles with granular permissions
- **Audit Logging**: Immutable audit trail with tamper-evident checksums
- **Session Management**: 15-minute idle timeout with refresh token rotation
- **Data Encryption**: Encrypted sensitive data at rest and in transit
- **Account Security**: Failed login protection and optional TOTP MFA

### Integration Ready
- **M-Pesa API**: Complete Lipa na M-Pesa and C2B integration
- **SHA Insurance**: Configurable claim submission with retry mechanisms
- **Background Jobs**: Redis-based job queue for async processing
- **File Management**: Secure file upload with S3 compatibility
- **Database Migrations**: Automated schema management and seeding

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### 🆕 **Quick Development Setup (Recommended)**

```bash
# Clone and setup
git clone <repository-url>
cd seth-clinic-cms

# Run the automated development setup
npm run setup:dev
```

This will:
- Create environment configuration
- Install all dependencies
- Set up Docker services
- Generate SSL certificates
- Start all services
- Verify system health

### Manual Development Setup

1. **Clone and Setup**
```bash
git clone <repository-url>
cd seth-clinic-cms
cp env.template .env
```

2. **Start Services**
```bash
# Start all services with Docker
npm run docker:dev

# Or start individual services
docker-compose up postgres redis -d
cd backend && npm install && npm run dev
npm install && npm run dev
```

3. **Initialize Database**
```bash
npm run db:migrate
npm run db:seed
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- **NEW: Prescription System**: http://localhost:3000/prescriptions
- **NEW: Diagnostics System**: http://localhost:3000/diagnostics
- Default Admin: username `admin`, password `admin123`

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis
- **Queue**: BullMQ for background job processing
- **Authentication**: JWT with refresh tokens and RBAC
- **Payments**: M-Pesa API integration
- **Insurance**: SHA claims processing

### Project Structure
```
seth-clinic-cms/
├── app/                    # Next.js app directory
│   ├── prescriptions/      # 🆕 NEW: Prescription system pages
│   └── diagnostics/        # 🆕 NEW: Diagnostics system pages
├── components/             # React components
│   ├── prescriptions/      # 🆕 NEW: Prescription form components
│   ├── diagnostics/        # 🆕 NEW: Diagnostics form components
│   └── patients/          # Enhanced patient input components
├── types/                  # Shared TypeScript types
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── routes/        # API routes including prescriptions & diagnostics
│   │   ├── models/        # Database models including Prescription & LabTest
│   │   └── services/      # Business logic
├── database/              # SQL schema and migrations
├── scripts/               # 🆕 NEW: Automated setup and deployment
├── docker-compose.yml     # Development environment
├── docker-compose.prod.yml # Production environment
└── docs/                  # Documentation
```

## 🆕 **Prescription System Features**

### Medicine Management
- **Real-time Stock**: Dropdown shows only medicines currently in stock
- **Expiry Warnings**: Visual indicators for medicines expiring soon
- **Smart Search**: Search by name, generic name, or category
- **Stock Information**: Display available quantity and pricing

### Patient Management
- **Dual Mode Input**: Search existing patients or register new ones
- **Smart Search**: Real-time search with debouncing
- **Comprehensive Forms**: Complete patient registration with visit information
- **Data Validation**: Zod schema validation for all inputs

### Auto-Save & Recovery
- **Automatic Saving**: Forms save every 30 seconds when changes detected
- **Local Storage**: Drafts saved to browser localStorage
- **Draft Recovery**: Restore work after page reloads or power outages
- **User-Specific**: Drafts tied to specific users and consultations

### Timestamping & Audit
- **Creation Timestamps**: All records include creation and update times
- **Database Integration**: Automatic timestamp management in PostgreSQL
- **Audit Trail**: Complete tracking of all prescription actions
- **User Context**: All actions tied to specific users

## 🆕 **Diagnostics System Features**

### Test Management
- **Real-time Test Catalog**: Dropdown shows only active laboratory tests
- **Test Information**: Displays test code, specimen type, turnaround time, and pricing
- **Smart Search**: Search tests by name, code, or description
- **Category Filtering**: Filter by test category (Hematology, Biochemistry, etc.)

### Patient Management
- **Dual Mode Input**: Search existing patients or register new ones
- **Smart Search**: Real-time search with debouncing
- **Comprehensive Forms**: Complete patient registration with visit information
- **Data Validation**: Zod schema validation for all inputs

### Urgency Management
- **Priority Levels**: Set urgency as Routine (24-48h), Urgent (4-6h), or STAT (1-2h)
- **Visual Indicators**: Clear visual cues for different urgency levels
- **Turnaround Time Display**: Shows expected completion time for each test
- **Status Tracking**: Real-time status updates throughout the testing process

### Auto-Save & Recovery
- **Automatic Saving**: Forms save every 30 seconds when changes detected
- **Local Storage**: Drafts saved to browser localStorage
- **Draft Recovery**: Restore work after page reloads or power outages
- **User-Specific**: Drafts tied to specific users and consultations

### Timestamping & Audit
- **Creation Timestamps**: All records include creation and update times
- **Database Integration**: Automatic timestamp management in PostgreSQL
- **Audit Trail**: Complete tracking of all lab request actions
- **User Context**: All actions tied to specific users

## 👥 User Roles & Permissions

### Role Hierarchy
1. **Admin**: Full system access, user management, system configuration
2. **Receptionist**: Patient registration, appointment scheduling
3. **Nurse**: Vitals recording, triage, patient queue management
4. **Clinical Officer**: 🆕 **Consultations, prescriptions, diagnostics, medical records**
5. **Pharmacist**: 🆕 **Medication dispensing, prescription management**
6. **Lab Technician**: 🆕 **NEW: Laboratory test processing, result entry**
7. **Inventory Manager**: Stock management, batch tracking, supplier management
8. **Claims Manager**: SHA claim processing, insurance reconciliation

## 💳 Payment Integration

### M-Pesa Setup
1. **Obtain Credentials**
   - Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke)
   - Create app and get Consumer Key/Secret
   - Configure callback URLs

2. **Environment Variables**
```env
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

3. **Testing**
   - Use sandbox credentials for development
   - Test phone number: 254708374149
   - Test amount: Any amount between 1-70000

### SHA Insurance Integration
1. **Configuration**
```env
SHA_API_URL=https://api.sha.go.ke
SHA_API_KEY=your_api_key
SHA_CLIENT_ID=your_client_id
SHA_CLIENT_SECRET=your_client_secret
```

2. **Claim Processing**
   - Claims are batched automatically
   - Background worker submits to SHA API
   - Retry mechanism with exponential backoff
   - Status tracking and reconciliation

## 🔒 Security Features

### Authentication & Authorization
- Username/password authentication (no OAuth dependency)
- JWT access tokens (15-minute expiry)
- Refresh token rotation
- Role-based access control on all endpoints
- Account lockout after 5 failed attempts

### Data Protection
- Bcrypt password hashing (12 rounds)
- Encrypted TOTP secrets for MFA
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- CSRF protection for cookie-based flows

### Audit & Compliance
- Immutable audit log with SHA-256 checksums
- All sensitive actions logged with user context
- IP address and user agent tracking
- Configurable retention policies
- Export capabilities for compliance reporting

## 📊 Database Schema

### Key Tables
- **patients**: Patient demographics and insurance info
- **visits**: Patient visits and status tracking
- **inventory_batches**: Medication batches with expiry tracking
- **invoices**: Financial transactions and billing
- **sha_claims**: Insurance claim processing
- **audit_logs**: Immutable audit trail
- **user_sessions**: Active session management
- **🆕 prescriptions**: Prescription records and items
- **🆕 prescription_items**: Individual prescription items with dosage info
- **🆕 lab_tests**: Available laboratory tests with pricing and turnaround times
- **🆕 lab_requests**: Laboratory test requests and status tracking
- **🆕 lab_request_items**: Individual test items with results and verification

### Migration System
```bash
# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Reset database (development only)
npm run db:reset
```

## 🔄 Background Jobs

### Job Types
- **Claim Processing**: Batch SHA claims and submit to API
- **Expiry Alerts**: Check medication expiry dates
- **Debt Reminders**: Send overdue payment notifications
- **Database Backup**: Automated daily backups
- **Stock Alerts**: Low inventory notifications
- **🆕 Lab Result Alerts**: Notify when lab results are ready

### Queue Management
```bash
# Start worker process
npm run worker

# Monitor jobs (Redis CLI)
redis-cli monitor
```

## 🧪 Testing

### Test Suite
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Backend tests
cd backend && npm test
```

### Test Categories
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user workflow testing
- **Security Tests**: Authentication and authorization testing

## 🚀 Production Deployment

### 🆕 **Automated Deployment (Recommended)**

```bash
# Run production deployment script
npm run deploy:prod
```

This will:
- Validate environment configuration
- Check SSL certificates
- Verify database schema
- Build and deploy services
- Run health checks
- Verify prescription and diagnostics systems

### Manual Deployment

1. **Environment Setup**
   - Copy `env.template` to `.env.production`
   - Update all credentials and URLs
   - Ensure HTTPS endpoints for callbacks

2. **Build Images**
```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```

3. **Database Migration**
```bash
NODE_ENV=production npm run db:migrate
```

4. **Start Services**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

5. **Health Checks**
   - Frontend: `GET /api/health`
   - Backend: `GET /health`
   - Database connectivity
   - Redis connectivity

### Production Checklist
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] M-Pesa production credentials configured
- [ ] SHA API production endpoints configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Log aggregation setup
- [ ] Security headers configured
- [ ] 🆕 **Prescription system tested and working**
- [ ] 🆕 **Diagnostics system tested and working**

## 📚 API Documentation

### 🆕 **Prescription Endpoints**
```
POST   /api/prescriptions          # Create prescription
GET    /api/prescriptions/:id      # Get prescription by ID
GET    /api/prescriptions/patient/:patientId  # Get patient prescriptions
PATCH  /api/prescriptions/:id/status  # Update prescription status
PATCH  /api/prescriptions/items/:id/dispense  # Update dispensed quantity
```

### 🆕 **Diagnostics Endpoints**
```
GET    /api/lab-tests              # Get all lab tests
GET    /api/lab-tests/available    # Get available tests for diagnostics
GET    /api/lab-tests/categories   # Get test categories
POST   /api/lab-requests           # Create lab request
GET    /api/lab-requests           # Get all lab requests
GET    /api/lab-requests/pending   # Get pending requests
PATCH  /api/lab-requests/:id/status # Update request status
PATCH  /api/lab-requests/items/:itemId # Update item results
```

### 🆕 **Enhanced Inventory Endpoints**
```
GET    /api/inventory/available-stock  # Get available stock for prescriptions
```

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/refresh        # Refresh access token
POST /api/auth/logout         # User logout
```

### Patient Management
```
GET    /api/patients          # List patients
POST   /api/patients          # Create patient
GET    /api/patients/:id      # Get patient details
PUT    /api/patients/:id      # Update patient
GET    /api/patients/search   # Search patients
```

### Pharmacy Operations
```
GET    /api/inventory         # List inventory items
POST   /api/inventory/dispense # Dispense medication
GET    /api/invoices          # List invoices
POST   /api/payments          # Record payment
```

### M-Pesa Integration
```
POST   /api/mpesa/stk-push    # Initiate STK push
POST   /api/mpesa/callback    # M-Pesa callback handler
GET    /api/mpesa/status      # Check transaction status
```

## 🆘 Support & Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service status
   - Verify DATABASE_URL environment variable
   - Ensure database exists and migrations are applied

2. **M-Pesa Integration Issues**
   - Verify callback URL is publicly accessible
   - Check consumer key/secret configuration
   - Ensure shortcode and passkey are correct

3. **Session Timeout Issues**
   - Check JWT_SECRET configuration
   - Verify Redis connection for session storage
   - Check system clock synchronization

4. **🆕 Prescription System Issues**
   - Verify prescription routes are loaded
   - Check inventory/available-stock endpoint
   - Ensure patient search is working
   - Verify auto-save functionality

5. **🆕 Diagnostics System Issues**
   - Verify diagnostics routes are loaded
   - Check lab-tests/available endpoint
   - Ensure patient search is working
   - Verify auto-save functionality

### Logs and Monitoring
```bash
# Application logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis

# Frontend logs
docker-compose logs -f frontend
```

### Performance Optimization
- Database indexing on frequently queried columns
- Redis caching for session data
- Connection pooling for database connections
- Background job processing for heavy operations
- 🆕 **Auto-save optimization for better user experience**

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Comprehensive test coverage required
- Security review for sensitive changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏥 About Seth Medical Clinic

Seth Medical Clinic is a Level 2 dispensary committed to providing quality healthcare services to the community. This management system was designed to streamline operations, improve patient care, and ensure compliance with Kenyan healthcare regulations.

## 🆕 **New Prescription & Diagnostics Systems**

The enhanced prescription and diagnostics systems represent significant upgrades to the clinic's clinical workflow:

### Prescription System
- **Real-time Medicine Availability**: Clinicians can see exactly what medicines are in stock
- **Enhanced Patient Management**: Efficient patient search and registration
- **Data Loss Protection**: Auto-save functionality protects against power outages
- **Comprehensive Audit Trail**: Complete tracking of all prescription activities
- **Professional Workflow**: Step-by-step prescription creation process

### Diagnostics System
- **Real-time Test Catalog**: Clinicians can see exactly what laboratory tests are available
- **Enhanced Patient Management**: Efficient patient search and registration
- **Data Loss Protection**: Auto-save functionality protects against power outages
- **Urgency Management**: Clear priority levels for test processing
- **Comprehensive Audit Trail**: Complete tracking of all lab request activities
- **Professional Workflow**: Step-by-step lab request creation process

For detailed information about the prescription system, see [PRESCRIPTION_SYSTEM_README.md](PRESCRIPTION_SYSTEM_README.md).

For detailed information about the diagnostics system, see [DIAGNOSTICS_SYSTEM_README.md](DIAGNOSTICS_SYSTEM_README.md).

For deployment guidance, see [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

---

For technical support or questions, please open an issue in the repository or contact the development team.
