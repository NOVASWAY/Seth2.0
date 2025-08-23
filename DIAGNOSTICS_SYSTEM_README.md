# Enhanced Diagnostics System - Feature Documentation

## 🎯 Overview

This document describes the enhanced diagnostics system implemented for the Seth Medical Clinic CMS, featuring real-time test selection, enhanced patient management, and robust auto-save functionality for laboratory test requests.

## ✨ New Features Implemented

### 1. **Real-time Test Selection from Available Catalog**
- **Dynamic Test Catalog**: Dropdown shows only active laboratory tests from the system
- **Test Information**: Displays test code, specimen type, turnaround time, and pricing
- **Search Functionality**: Search tests by name, code, or description
- **Category Filtering**: Filter tests by category (Hematology, Biochemistry, Microbiology, etc.)
- **Smart Filtering**: Automatically filters out inactive tests

### 2. **Enhanced Patient Input System**
- **Dual Mode**: Choose between searching existing patients or registering new ones
- **Smart Search**: Search by name, OP number, or phone number
- **Real-time Results**: Instant search results with patient details
- **Manual Override**: Option to manually type patient information

### 3. **Comprehensive Timestamping**
- **Creation Timestamps**: All records include creation and update timestamps
- **Audit Trail**: Complete tracking of when lab requests and patient records are created/modified
- **Database Integration**: Automatic timestamp management in PostgreSQL

### 4. **Auto-Save & Power Outage Protection**
- **Automatic Saving**: Forms save every 30 seconds when changes are detected
- **Local Storage Backup**: Drafts are saved to browser localStorage
- **Draft Recovery**: Restore previous work after power outages or server downtime
- **User-Specific**: Drafts are tied to specific users and consultations

### 5. **Urgency Management**
- **Priority Levels**: Set urgency as Routine (24-48h), Urgent (4-6h), or STAT (1-2h)
- **Visual Indicators**: Clear visual cues for different urgency levels
- **Turnaround Time Display**: Shows expected completion time for each test
- **Status Tracking**: Real-time status updates throughout the testing process

## 🏗️ Technical Implementation

### Backend Components

#### 1. **Lab Test Routes** (`/backend/src/routes/lab-tests.ts`)
```typescript
// Key endpoints:
GET    /api/lab-tests              # Get all lab tests
GET    /api/lab-tests/available    # Get available tests for diagnostics
GET    /api/lab-tests/categories   # Get test categories
POST   /api/lab-tests              # Create new lab test (Admin)
PUT    /api/lab-tests/:id          # Update lab test (Admin)
DELETE /api/lab-tests/:id          # Delete lab test (Admin)
```

#### 2. **Lab Request Routes** (`/backend/src/routes/lab-requests.ts`)
```typescript
// Key endpoints:
GET    /api/lab-requests           # Get all lab requests
GET    /api/lab-requests/pending   # Get pending requests
GET    /api/lab-requests/completed # Get completed requests
GET    /api/lab-requests/:id       # Get specific request
POST   /api/lab-requests           # Create new lab request
PATCH  /api/lab-requests/:id/status # Update request status
PATCH  /api/lab-requests/items/:itemId # Update item status/results
```

#### 3. **Lab Test Model** (`/backend/src/models/LabTest.ts`)
```typescript
export class LabTestModel {
  static async create(data: CreateLabTestData): Promise<LabTest>
  static async findById(id: string): Promise<LabTest | null>
  static async getAvailableTests(search?: string, category?: string): Promise<LabTest[]>
  static async getCategories(): Promise<string[]>
  static async update(id: string, data: UpdateLabTestData): Promise<LabTest | null>
  static async delete(id: string): Promise<boolean>
}
```

#### 4. **Lab Request Model** (`/backend/src/models/LabRequest.ts`)
```typescript
export class LabRequestModel {
  static async create(data: CreateLabRequestData): Promise<LabRequest>
  static async findById(id: string): Promise<LabRequest | null>
  static async findByPatientId(patientId: string): Promise<LabRequest[]>
  static async getPendingRequests(): Promise<LabRequest[]>
  static async updateStatus(id: string, data: UpdateLabRequestStatusData): Promise<LabRequest | null>
  static async updateItemStatus(itemId: string, data: UpdateLabRequestItemStatusData): Promise<LabRequestItem | null>
}
```

### Frontend Components

#### 1. **Diagnostics Form** (`/components/diagnostics/DiagnosticsForm.tsx`)
```typescript
export function DiagnosticsForm({ 
  consultationId, 
  visitId, 
  patientId, 
  onSuccess, 
  onCancel 
}: DiagnosticsFormProps) {
  // Features:
  // - Real-time test selection with search and filtering
  // - Auto-save functionality every 30 seconds
  // - Draft recovery from localStorage
  // - Comprehensive form validation
  // - Urgency level selection
  // - Clinical notes and context
}
```

#### 2. **Diagnostics Page** (`/app/diagnostics/page.tsx`)
```typescript
export default function DiagnosticsPage() {
  // Features:
  // - Two-step workflow (Patient Selection → Lab Request)
  // - Progress indicator
  // - Feature overview cards
  // - System status information
  // - Integration with EnhancedPatientInput component
}
```

## 📊 Database Schema

### New Tables

#### 1. **lab_tests** (New Table)
```sql
CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_category VARCHAR(100) NOT NULL,
    description TEXT,
    specimen_type VARCHAR(100) NOT NULL,
    turnaround_time INTEGER NOT NULL, -- in hours
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    reference_ranges JSONB,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **lab_request_items** (New Table)
```sql
CREATE TABLE lab_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_request_id UUID NOT NULL REFERENCES lab_requests(id),
    test_id UUID NOT NULL REFERENCES lab_tests(id),
    test_name VARCHAR(200) NOT NULL,
    test_code VARCHAR(50) NOT NULL,
    specimen_type VARCHAR(100) NOT NULL,
    urgency VARCHAR(20) DEFAULT 'ROUTINE',
    status VARCHAR(30) DEFAULT 'REQUESTED',
    clinical_notes TEXT,
    result_data JSONB,
    reference_ranges JSONB,
    abnormal_flags JSONB,
    technician_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    reported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enhanced Tables

#### 3. **lab_requests** (Enhanced)
```sql
-- Added new fields:
ALTER TABLE lab_requests ADD COLUMN specimen_collected_at TIMESTAMP;
ALTER TABLE lab_requests ADD COLUMN collected_by UUID REFERENCES users(id);
ALTER TABLE lab_requests ADD COLUMN expected_completion_at TIMESTAMP;
```

## 🔧 Configuration

### Environment Variables
```env
# Diagnostics System Configuration
LOG_LEVEL=debug
ENABLE_AUDIT_LOGGING=true
AUTO_SAVE_INTERVAL=30000
```

### User Roles
```typescript
export enum UserRole {
  ADMIN = "ADMIN",
  CLINICAL_OFFICER = "CLINICAL_OFFICER",
  LAB_TECHNICIAN = "LAB_TECHNICIAN", // 🆕 NEW
  // ... other roles
}
```

## 🚀 Usage Guide

### 1. **Accessing the Diagnostics System**
```bash
# Start the development environment
npm run diagnostics:dev

# Access the system
http://localhost:3000/diagnostics
```

### 2. **Creating a Lab Request**

#### Step 1: Patient Selection
- Search for existing patients by name, OP number, or phone
- Or register a new patient with comprehensive information
- Select the patient to proceed to lab request creation

#### Step 2: Lab Request Creation
- **Clinical Information**: Enter clinical notes and select urgency level
- **Test Selection**: 
  - Search for tests by name or code
  - Filter by category
  - Select tests from the dropdown
  - Add test-specific clinical notes
- **Review**: Check test details, pricing, and turnaround times
- **Submit**: Create the lab request

### 3. **Auto-Save Features**
- **Automatic Saving**: Forms save every 30 seconds
- **Draft Recovery**: Previous work is restored on page reload
- **Visual Feedback**: Save status is displayed in real-time

### 4. **Test Management (Admin)**
```bash
# Access test management
GET /api/lab-tests              # View all tests
POST /api/lab-tests             # Create new test
PUT /api/lab-tests/:id          # Update test
DELETE /api/lab-tests/:id       # Delete test
```

## 🔍 API Endpoints

### Lab Tests
```typescript
// Get available tests for diagnostics
GET /api/lab-tests/available?search=blood&category=Hematology

// Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "testCategory": "Hematology",
      "specimenType": "Blood",
      "turnaroundTime": 24,
      "price": 1500.00,
      "description": "Complete blood count with differential",
      "isActive": true
    }
  ]
}
```

### Lab Requests
```typescript
// Create lab request
POST /api/lab-requests

// Request body:
{
  "visitId": "uuid",
  "patientId": "uuid",
  "clinicalNotes": "Patient presents with fever and fatigue",
  "urgency": "URGENT",
  "items": [
    {
      "testId": "uuid",
      "testName": "Complete Blood Count",
      "testCode": "CBC",
      "specimenType": "Blood",
      "clinicalNotes": "Check for infection markers"
    }
  ]
}
```

## 🛡️ Security & Validation

### Input Validation
```typescript
// Zod schemas for validation
const diagnosticsItemSchema = z.object({
  testId: z.string().min(1, "Test is required"),
  testName: z.string().min(1, "Test name is required"),
  testCode: z.string().min(1, "Test code is required"),
  specimenType: z.string().min(1, "Specimen type is required"),
  clinicalNotes: z.string().optional(),
})

const diagnosticsSchema = z.object({
  patientId: z.string().optional(),
  visitId: z.string().optional(),
  consultationId: z.string().optional(),
  clinicalNotes: z.string().optional(),
  urgency: z.enum(["ROUTINE", "URGENT", "STAT"]),
  items: z.array(diagnosticsItemSchema).min(1, "At least one test is required"),
})
```

### Authorization
```typescript
// Role-based access control
authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN])

// Admin only operations
authorize([UserRole.ADMIN]) // For test management
```

## 📱 User Interface Features

### 1. **Test Selection Interface**
- **Search Bar**: Real-time search with debouncing
- **Category Filter**: Dropdown to filter by test category
- **Test Cards**: Display test information with badges
- **Add/Remove**: Easy addition and removal of tests

### 2. **Urgency Management**
- **Visual Indicators**: Icons and colors for different urgency levels
- **Time Estimates**: Display expected turnaround times
- **Priority Sorting**: Automatic sorting by urgency

### 3. **Auto-Save Status**
- **Real-time Feedback**: Shows save status (saving/saved/error)
- **Last Saved Time**: Displays when last auto-save occurred
- **Draft Recovery**: Automatic restoration of previous work

## 🔄 Workflow Integration

### 1. **Patient Flow Integration**
- **Visit Status Updates**: Automatically updates visit status to "WAITING_LAB"
- **Queue Management**: Integrates with patient queue system
- **Status Tracking**: Real-time status updates throughout the process

### 2. **Clinical Workflow**
- **Consultation Integration**: Links lab requests to consultations
- **Clinical Context**: Comprehensive clinical notes and context
- **Follow-up Management**: Tracks results and follow-up requirements

### 3. **Financial Integration**
- **Pricing Display**: Shows test costs in real-time
- **Invoice Generation**: Automatic invoice creation for lab services
- **Insurance Claims**: Integration with SHA insurance system

## 🧪 Testing

### Unit Tests
```bash
# Run diagnostics system tests
npm test -- --testPathPattern=diagnostics

# Test coverage
npm run test:coverage
```

### Integration Tests
```bash
# Test API endpoints
npm run test:integration -- --testPathPattern=lab-tests
npm run test:integration -- --testPathPattern=lab-requests
```

### E2E Tests
```bash
# Test complete workflow
npm run test:e2e -- --testPathPattern=diagnostics
```

## 🚀 Deployment

### Development Setup
```bash
# Quick start
npm run diagnostics:dev

# Manual setup
npm run docker:dev
# Access: http://localhost:3000/diagnostics
```

### Production Deployment
```bash
# Deploy with diagnostics system
npm run deploy:prod

# Verify diagnostics endpoints
curl -f http://yourdomain.com/api/lab-tests/available
curl -f http://yourdomain.com/api/lab-requests
```

## 📊 Performance Metrics

### Expected Response Times
- **Test Search**: < 200ms
- **Test Loading**: < 300ms
- **Request Creation**: < 500ms
- **Auto-save**: < 100ms

### Resource Usage
- **Database Queries**: Optimized with proper indexing
- **Memory Usage**: Efficient caching of test catalog
- **Network**: Minimal API calls with smart caching

## 🔮 Future Enhancements

### Planned Features
1. **Result Management**: Complete lab results entry and verification
2. **Report Generation**: Automated lab report generation
3. **Quality Control**: QC tracking and alerts
4. **Equipment Integration**: Direct integration with lab equipment
5. **External Lab Integration**: Integration with external laboratory services

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live status updates
2. **Advanced Search**: Full-text search with fuzzy matching
3. **Bulk Operations**: Batch test requests and processing
4. **Mobile Support**: Responsive design for mobile devices
5. **Offline Support**: Offline capability with sync when online

## 🆘 Troubleshooting

### Common Issues

#### 1. **Tests Not Loading**
```bash
# Check API endpoint
curl -f http://localhost:5000/api/lab-tests/available

# Check database connection
docker-compose logs postgres

# Verify test data exists
docker-compose exec postgres psql -U postgres -d seth_clinic -c "SELECT COUNT(*) FROM lab_tests;"
```

#### 2. **Auto-save Not Working**
```bash
# Check localStorage
# Open browser dev tools → Application → Local Storage

# Check for errors
docker-compose logs frontend
```

#### 3. **Patient Search Issues**
```bash
# Verify patient API
curl -f http://localhost:5000/api/patients/search?q=test

# Check patient data
docker-compose exec postgres psql -U postgres -d seth_clinic -c "SELECT COUNT(*) FROM patients;"
```

### Debug Commands
```bash
# Check system health
npm run health:check

# View logs
npm run docker:logs

# Restart services
docker-compose restart backend frontend
```

## 📚 Additional Resources

### Documentation
- [Prescription System README](./PRESCRIPTION_SYSTEM_README.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_CHECKLIST.md)

### Code Examples
- [Diagnostics Form Component](./components/diagnostics/DiagnosticsForm.tsx)
- [Lab Test Model](./backend/src/models/LabTest.ts)
- [Lab Request Routes](./backend/src/routes/lab-requests.ts)

---

**Version**: 1.0.0  
**Author**: Development Team  
**Last Updated**: December 2024

The diagnostics system is now fully integrated and ready for production use, providing a comprehensive laboratory test management solution with real-time capabilities and robust data protection.
