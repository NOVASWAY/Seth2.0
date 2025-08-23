# Enhanced Prescription System - Feature Documentation

## 🎯 Overview

This document describes the enhanced prescription system implemented for the Seth Medical Clinic CMS, featuring real-time stock integration, enhanced patient management, and robust auto-save functionality.

## ✨ New Features Implemented

### 1. **Medicine Dropdown from Available Stock**
- **Real-time Integration**: Dropdown shows only medicines currently available in stock
- **Stock Information**: Displays available quantity, unit, and expiry warnings
- **Search Functionality**: Search medicines by name, generic name, or category
- **Smart Filtering**: Automatically filters out expired or out-of-stock items

### 2. **Enhanced Patient Input System**
- **Dual Mode**: Choose between searching existing patients or registering new ones
- **Smart Search**: Search by name, OP number, or phone number
- **Real-time Results**: Instant search results with patient details
- **Manual Override**: Option to manually type patient information

### 3. **Comprehensive Timestamping**
- **Creation Timestamps**: All records include creation and update timestamps
- **Audit Trail**: Complete tracking of when prescriptions and patient records are created/modified
- **Database Integration**: Automatic timestamp management in PostgreSQL

### 4. **Auto-Save & Power Outage Protection**
- **Automatic Saving**: Forms save every 30 seconds when changes are detected
- **Local Storage Backup**: Drafts are saved to browser localStorage
- **Draft Recovery**: Restore previous work after power outages or server downtime
- **User-Specific**: Drafts are tied to specific users and consultations

## 🏗️ Technical Implementation

### Backend Components

#### 1. **Prescription Routes** (`/backend/src/routes/prescriptions.ts`)
```typescript
// Key endpoints:
POST /api/prescriptions          # Create new prescription
GET  /api/prescriptions/:id      # Get prescription by ID
GET  /api/prescriptions/patient/:patientId  # Get patient prescriptions
PATCH /api/prescriptions/:id/status  # Update prescription status
PATCH /api/prescriptions/items/:id/dispense  # Update dispensed quantity
```

#### 2. **Prescription Model** (`/backend/src/models/Prescription.ts`)
- Full CRUD operations for prescriptions and prescription items
- Transaction support for data integrity
- Comprehensive error handling

#### 3. **Enhanced Inventory Endpoint**
```typescript
GET /api/inventory/available-stock?search=&category=
```
- Returns only medicines with available stock
- Includes expiry warnings and pricing information
- Supports search and category filtering

### Frontend Components

#### 1. **PrescriptionForm** (`/components/prescriptions/PrescriptionForm.tsx`)
- Dynamic medicine selection with real-time stock data
- Form validation using Zod schema
- Auto-save functionality with visual indicators
- Support for multiple prescription items

#### 2. **EnhancedPatientInput** (`/components/patients/EnhancedPatientInput.tsx`)
- Dual-mode patient input (search vs. register)
- Real-time patient search with debouncing
- Comprehensive patient registration form
- Auto-save for all input fields

#### 3. **Demo Page** (`/app/prescriptions/page.tsx`)
- Step-by-step prescription workflow
- Feature showcase and demonstration
- Progress indicators and user guidance

## 🚀 Usage Guide

### Accessing the Prescription System

1. **Navigate to Dashboard**: Login and go to the main dashboard
2. **Click "Open Prescriptions"**: Use the quick action card
3. **Follow the Workflow**: Complete the two-step process

### Step 1: Patient Selection

#### Option A: Search Existing Patient
1. Select "Search Existing Patient" radio button
2. Type patient name, OP number, or phone
3. Click on the desired patient from search results
4. Click "Continue with Selected Patient"

#### Option B: Register New Patient
1. Select "Register New Patient" radio button
2. Fill in all required fields (marked with *)
3. Add optional visit information
4. Click "Create Patient"

### Step 2: Create Prescription

1. **Add Medicines**: Click "Add Medicine" for each prescription item
2. **Select Medicine**: Choose from dropdown (shows available stock)
3. **Fill Details**: Enter dosage, frequency, duration, and quantity
4. **Add Instructions**: Optional special instructions for each medicine
5. **Submit**: Click "Create Prescription" when complete

## 🔧 Configuration

### Environment Variables

Ensure these are set in your `.env` file:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/seth_clinic

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# API Configuration
CORS_ORIGIN=http://localhost:3000
```

### Database Setup

1. **Run Migrations**: Ensure the database schema is up to date
2. **Seed Data**: Populate with sample inventory items and patients
3. **Verify Tables**: Check that `prescriptions` and `prescription_items` tables exist

## 📊 Data Flow

### Prescription Creation Flow
```
1. User selects/creates patient
2. User adds prescription items
3. Form auto-saves every 30 seconds
4. User submits prescription
5. Backend validates and creates records
6. Prescription is saved to database
7. Draft is cleared from localStorage
```

### Auto-Save Flow
```
1. User makes changes to form
2. Form detects changes (isDirty = true)
3. Timer starts (30-second interval)
4. Form data saved to localStorage
5. Visual indicator shows save status
6. Draft can be recovered on page reload
```

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication required for all endpoints
- Role-based access control (CLINICAL_OFFICER, PHARMACIST, ADMIN)
- Session management with refresh tokens

### Data Validation
- Comprehensive input validation using Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection through input sanitization

### Audit Logging
- All prescription actions are logged
- User context and timestamps recorded
- Immutable audit trail for compliance

## 🔍 Troubleshooting

### Common Issues

#### 1. **Stock Not Loading**
- Check database connection
- Verify inventory items exist
- Check user permissions

#### 2. **Auto-Save Not Working**
- Check browser localStorage support
- Verify form validation errors
- Check console for JavaScript errors

#### 3. **Patient Search Issues**
- Ensure patient data exists in database
- Check search endpoint configuration
- Verify authentication tokens

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## 📈 Performance Considerations

### Optimization Features
- **Debounced Search**: Patient search waits 300ms after typing
- **Lazy Loading**: Stock data loaded only when needed
- **Efficient Queries**: Database queries optimized with proper indexing
- **Caching**: Local storage used for draft persistence

### Scalability
- **Pagination**: Large result sets are paginated
- **Connection Pooling**: Database connections are pooled
- **Background Processing**: Heavy operations can be queued

## 🔮 Future Enhancements

### Planned Features
1. **Bulk Prescription**: Create multiple prescriptions at once
2. **Template System**: Save and reuse common prescription templates
3. **Drug Interaction Warnings**: Check for potential drug interactions
4. **Mobile Optimization**: Responsive design for mobile devices
5. **Offline Support**: Enhanced offline functionality with service workers

### Integration Opportunities
1. **Lab Results**: Link prescriptions to lab test results
2. **Pharmacy Integration**: Direct communication with pharmacy systems
3. **Insurance Claims**: Automated insurance claim generation
4. **Patient Portal**: Allow patients to view their prescriptions

## 📚 API Reference

### Prescription Endpoints

#### Create Prescription
```http
POST /api/prescriptions
Content-Type: application/json
Authorization: Bearer <token>

{
  "consultationId": "uuid",
  "visitId": "uuid",
  "patientId": "uuid",
  "items": [
    {
      "inventoryItemId": "uuid",
      "itemName": "Paracetamol 500mg",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "7 days",
      "quantityPrescribed": 14,
      "instructions": "Take with food"
    }
  ]
}
```

#### Get Available Stock
```http
GET /api/inventory/available-stock?search=paracetamol&category=analgesic
Authorization: Bearer <token>
```

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Paracetamol 500mg",
      "category": "Analgesic",
      "unit": "tablets",
      "availableQuantity": 500,
      "sellingPrice": 5.00,
      "hasExpiringStock": false
    }
  ]
}
```

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations
5. Start development server: `npm run dev`

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive testing

## 📞 Support

For technical support or questions about the prescription system:
1. Check this documentation
2. Review the code comments
3. Open an issue in the repository
4. Contact the development team

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Author**: Development Team
