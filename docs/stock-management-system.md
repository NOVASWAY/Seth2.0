# Stock Management System

## Comprehensive Inventory Management for Medical Supplies

### 🎯 **Overview**

The Stock Management System provides comprehensive inventory management for medical supplies, tools, equipment, and medications. It includes categorized organization, real-time tracking, automated alerts, and detailed reporting capabilities.

---

## 📂 **Stock Categories System**

### **Main Categories**

#### **1. MEDICATIONS** 💊
- All types of medications and drugs
- Controlled substances tracking
- Prescription requirements
- Expiry date monitoring

#### **2. MEDICAL_TOOLS** 🛠️
- Medical instruments and tools
- **Subcategories:**
  - **SYRINGES** - Syringes and needles
  - **SCALPELS** - Scalpels and cutting instruments
  - **FORCEPS** - Forceps and grasping instruments
  - **THERMOMETERS** - Thermometers and temperature measuring devices
  - **STETHOSCOPES** - Stethoscopes and listening devices

#### **3. MEDICAL_EQUIPMENT** 🏥
- Medical equipment and devices
- **Subcategories:**
  - **BLOOD_PRESSURE_MONITORS** - Blood pressure monitoring equipment
  - **GLUCOSE_METERS** - Glucose monitoring devices
  - **PULSE_OXIMETERS** - Pulse oximetry devices
  - **WEIGHING_SCALES** - Patient weighing scales

#### **4. SUPPLIES** 📦
- General medical supplies
- **Subcategories:**
  - **BANDAGES** - Bandages and wound care supplies
  - **GLOVES** - Medical gloves and protective equipment
  - **MASKS** - Medical masks and respiratory protection
  - **GAUZE** - Gauze and dressing materials

#### **5. DIAGNOSTIC_SUPPLIES** 🔬
- Diagnostic and testing supplies
- **Subcategories:**
  - **TEST_STRIPS** - Diagnostic test strips
  - **LAB_TUBES** - Laboratory test tubes and containers
  - **SWABS** - Medical swabs and collection devices

#### **6. SURGICAL_SUPPLIES** ⚕️
- Surgical instruments and supplies

#### **7. EMERGENCY_SUPPLIES** 🚨
- Emergency and first aid supplies

#### **8. CLEANING_SUPPLIES** 🧽
- Cleaning and sanitization supplies

#### **9. OFFICE_SUPPLIES** 📋
- Office and administrative supplies

---

## 📦 **Stock Items Management**

### **Item Properties**
- **Basic Information:**
  - Name and description
  - SKU (Stock Keeping Unit)
  - Barcode
  - Category assignment
  - Unit of measure

- **Pricing:**
  - Unit price
  - Cost price
  - Selling price
  - Total cost value
  - Total selling value

- **Stock Levels:**
  - Current stock
  - Minimum stock level
  - Maximum stock level
  - Reorder level

- **Additional Details:**
  - Supplier information
  - Expiry date
  - Batch number
  - Storage location
  - Controlled substance flag
  - Prescription requirement flag

### **Stock Status Indicators**
- **IN_STOCK** - Stock level above reorder level
- **LOW_STOCK** - Stock level at or below reorder level
- **CRITICAL_STOCK** - Stock level at or below minimum level
- **OUT_OF_STOCK** - No stock available

---

## 🔄 **Stock Movement Tracking**

### **Movement Types**
- **IN** - Stock received (purchases, returns)
- **OUT** - Stock issued (patient treatment, internal use)
- **ADJUSTMENT** - Manual stock corrections
- **TRANSFER** - Stock moved between locations
- **EXPIRED** - Stock removed due to expiry
- **DAMAGED** - Stock removed due to damage

### **Movement Tracking**
- Quantity changes
- Unit price and total value
- Reference to related records (purchases, prescriptions)
- Batch numbers and expiry dates
- Location transfers
- Performed by user tracking
- Movement date and notes

---

## 🚨 **Stock Alerts System**

### **Alert Types**
- **LOW_STOCK** - Stock below reorder level
- **OUT_OF_STOCK** - No stock available
- **EXPIRY_WARNING** - Items approaching expiry
- **EXPIRED** - Items past expiry date

### **Alert Management**
- Automatic alert generation
- Alert resolution tracking
- User notifications
- Alert history

---

## 📊 **Stock Reports & Analytics**

### **Summary Reports**
- **Overall Stock Summary:**
  - Total items count
  - Out of stock count
  - Low stock count
  - In stock count
  - Total cost value
  - Total selling value

- **Category-wise Summary:**
  - Items per category
  - Stock levels per category
  - Cost and selling values per category
  - Out of stock and low stock counts per category

### **Detailed Reports**
- Stock movement history
- Low stock alerts
- Expiry tracking
- Category performance
- Supplier analysis

---

## 🔧 **API Endpoints**

### **Stock Categories**
```
GET    /api/stock-categories                    - Get all categories
GET    /api/stock-categories/:id                - Get category by ID
GET    /api/stock-categories/:id/subcategories  - Get subcategories
GET    /api/stock-categories/hierarchy/tree     - Get category hierarchy
GET    /api/stock-categories/stats/summary      - Get category statistics
POST   /api/stock-categories                    - Create new category
PUT    /api/stock-categories/:id                - Update category
DELETE /api/stock-categories/:id                - Delete category
```

### **Stock Items**
```
GET    /api/stock-items                         - Get all items
GET    /api/stock-items/:id                     - Get item by ID
GET    /api/stock-items/sku/:sku                - Get item by SKU
GET    /api/stock-items/alerts/low-stock        - Get low stock items
GET    /api/stock-items/stats/summary           - Get stock summary
POST   /api/stock-items                         - Create new item
PUT    /api/stock-items/:id                     - Update item
DELETE /api/stock-items/:id                     - Delete item
```

### **Query Parameters**
- `category_id` - Filter by category
- `low_stock_only` - Show only low stock items
- `search` - Search by name, description, SKU, or barcode
- `limit` - Pagination limit
- `offset` - Pagination offset

---

## 🗄️ **Database Schema**

### **Core Tables**
- **stock_categories** - Category definitions
- **stock_items** - Individual stock items
- **stock_movements** - All stock changes
- **stock_adjustments** - Manual stock corrections
- **stock_alerts** - Low stock and expiry alerts

### **Supporting Tables**
- **stock_requests** - Internal stock requests
- **stock_request_items** - Items in requests
- **stock_suppliers** - Supplier information
- **stock_purchases** - Purchase orders
- **stock_purchase_items** - Items in purchases

### **Views**
- **stock_summary** - Comprehensive stock overview
- **low_stock_items** - Items requiring attention

---

## 🔒 **Security & Permissions**

### **Role-Based Access**
- **ADMIN** - Full access to all stock management features
- **CLINICAL_OFFICER** - Can view and update stock items
- **NURSE** - Can view stock items and request supplies
- **PHARMACIST** - Can manage medication stock

### **Audit Trail**
- All stock changes are logged
- User tracking for all operations
- IP address and user agent logging
- Complete change history

---

## 🚀 **Key Features**

### **1. Categorized Organization**
- Hierarchical category structure
- Easy navigation and filtering
- Logical grouping of related items

### **2. Real-Time Tracking**
- Live stock level updates
- Automatic movement recording
- Instant alert generation

### **3. Automated Alerts**
- Low stock notifications
- Expiry warnings
- Out of stock alerts
- Customizable thresholds

### **4. Comprehensive Search**
- Search by name, description, SKU, barcode
- Category-based filtering
- Advanced filtering options

### **5. Detailed Reporting**
- Stock summaries and analytics
- Category performance metrics
- Cost and value tracking
- Historical data analysis

### **6. Integration Ready**
- RESTful API design
- WebSocket support for real-time updates
- Event logging for system integration
- Export capabilities

---

## 📈 **Usage Examples**

### **Adding New Stock Items**
```javascript
// Create a new syringe item
const newItem = {
  name: 'Disposable Syringes 5ml',
  description: 'Sterile disposable syringes 5ml with needles',
  categoryId: 'syringe-category-id',
  sku: 'SYR-5ML-001',
  unitOfMeasure: 'pieces',
  unitPrice: 2.50,
  costPrice: 1.80,
  sellingPrice: 3.00,
  minimumStockLevel: 50,
  currentStock: 200,
  reorderLevel: 75,
  location: 'Storage Room A'
}
```

### **Checking Low Stock**
```javascript
// Get all low stock items
const lowStockItems = await axios.get('/api/stock-items/alerts/low-stock')
```

### **Stock Movement Recording**
```javascript
// Record stock movement
const movement = {
  stockItemId: 'item-id',
  movementType: 'OUT',
  quantity: 10,
  reason: 'Patient treatment',
  performedBy: 'user-id'
}
```

---

## 🎯 **Benefits**

1. **Organized Inventory** - Clear categorization of all medical supplies
2. **Prevent Stockouts** - Automated alerts prevent running out of critical items
3. **Cost Control** - Track costs and values for better financial management
4. **Compliance** - Audit trail ensures regulatory compliance
5. **Efficiency** - Quick search and filtering improve workflow
6. **Integration** - Seamless integration with other clinic systems
7. **Scalability** - Designed to handle growing inventory needs

---

## 🔮 **Future Enhancements**

- Barcode scanning integration
- Mobile app for stock management
- Automated reorder suggestions
- Supplier integration
- Advanced analytics and forecasting
- Multi-location support
- Integration with procurement systems

The Stock Management System provides a solid foundation for comprehensive inventory management in medical facilities, ensuring efficient operations and optimal patient care! 🎉
