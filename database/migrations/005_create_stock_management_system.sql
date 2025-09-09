-- Migration: Create Stock Management System with Categories
-- Description: Comprehensive stock management for medical supplies, tools, equipment, and medications

-- Create stock categories table
CREATE TABLE stock_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES stock_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stock items table
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES stock_categories(id),
    sku VARCHAR(100) UNIQUE, -- Stock Keeping Unit
    barcode VARCHAR(100) UNIQUE,
    unit_of_measure VARCHAR(50) NOT NULL, -- pieces, boxes, vials, etc.
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    selling_price DECIMAL(10,2) DEFAULT 0.00,
    minimum_stock_level INTEGER DEFAULT 0,
    maximum_stock_level INTEGER DEFAULT 1000,
    current_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    supplier_id UUID, -- Will reference suppliers table if needed
    expiry_date DATE,
    batch_number VARCHAR(100),
    location VARCHAR(100), -- Storage location in clinic
    is_active BOOLEAN DEFAULT true,
    is_controlled_substance BOOLEAN DEFAULT false, -- For controlled medications
    requires_prescription BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create stock movements table (for tracking all stock changes)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    movement_type VARCHAR(50) NOT NULL, -- IN, OUT, ADJUSTMENT, TRANSFER, EXPIRED, DAMAGED
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(10,2),
    reference_type VARCHAR(50), -- PURCHASE, SALE, PRESCRIPTION, ADJUSTMENT, etc.
    reference_id UUID, -- ID of the related record (purchase order, prescription, etc.)
    reason TEXT,
    batch_number VARCHAR(100),
    expiry_date DATE,
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    performed_by UUID NOT NULL REFERENCES users(id),
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create stock adjustments table (for manual stock corrections)
CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    adjustment_type VARCHAR(50) NOT NULL, -- INCREASE, DECREASE, CORRECTION
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    quantity_adjusted INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    adjusted_by UUID NOT NULL REFERENCES users(id),
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approval_date TIMESTAMP
);

-- Create stock alerts table (for low stock notifications)
CREATE TABLE stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    alert_type VARCHAR(50) NOT NULL, -- LOW_STOCK, OUT_OF_STOCK, EXPIRY_WARNING, EXPIRED
    current_stock INTEGER,
    threshold_value INTEGER,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stock requests table (for internal stock requests)
CREATE TABLE stock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_for UUID REFERENCES users(id), -- If requesting for someone else
    request_type VARCHAR(50) NOT NULL, -- INTERNAL_USE, PATIENT_TREATMENT, EMERGENCY
    priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, FULFILLED
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    required_date DATE,
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approval_date TIMESTAMP,
    fulfilled_by UUID REFERENCES users(id),
    fulfillment_date TIMESTAMP
);

-- Create stock request items table (items in a stock request)
CREATE TABLE stock_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    requested_quantity INTEGER NOT NULL,
    approved_quantity INTEGER DEFAULT 0,
    fulfilled_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    notes TEXT
);

-- Create stock suppliers table
CREATE TABLE stock_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stock purchases table
CREATE TABLE stock_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES stock_suppliers(id),
    purchase_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ORDERED, DELIVERED, CANCELLED
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stock purchase items table
CREATE TABLE stock_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES stock_purchases(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    expiry_date DATE,
    batch_number VARCHAR(100),
    notes TEXT
);

-- Insert default stock categories
INSERT INTO stock_categories (name, description) VALUES
('MEDICATIONS', 'All types of medications and drugs'),
('MEDICAL_TOOLS', 'Medical instruments and tools'),
('MEDICAL_EQUIPMENT', 'Medical equipment and devices'),
('SUPPLIES', 'General medical supplies'),
('DIAGNOSTIC_SUPPLIES', 'Diagnostic and testing supplies'),
('SURGICAL_SUPPLIES', 'Surgical instruments and supplies'),
('EMERGENCY_SUPPLIES', 'Emergency and first aid supplies'),
('CLEANING_SUPPLIES', 'Cleaning and sanitization supplies'),
('OFFICE_SUPPLIES', 'Office and administrative supplies');

-- Insert subcategories for MEDICAL_TOOLS
INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'SYRINGES', 'Syringes and needles', id FROM stock_categories WHERE name = 'MEDICAL_TOOLS';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'SCALPELS', 'Scalpels and cutting instruments', id FROM stock_categories WHERE name = 'MEDICAL_TOOLS';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'FORCEPS', 'Forceps and grasping instruments', id FROM stock_categories WHERE name = 'MEDICAL_TOOLS';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'THERMOMETERS', 'Thermometers and temperature measuring devices', id FROM stock_categories WHERE name = 'MEDICAL_TOOLS';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'STETHOSCOPES', 'Stethoscopes and listening devices', id FROM stock_categories WHERE name = 'MEDICAL_TOOLS';

-- Insert subcategories for MEDICAL_EQUIPMENT
INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'BLOOD_PRESSURE_MONITORS', 'Blood pressure monitoring equipment', id FROM stock_categories WHERE name = 'MEDICAL_EQUIPMENT';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'GLUCOSE_METERS', 'Glucose monitoring devices', id FROM stock_categories WHERE name = 'MEDICAL_EQUIPMENT';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'PULSE_OXIMETERS', 'Pulse oximetry devices', id FROM stock_categories WHERE name = 'MEDICAL_EQUIPMENT';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'WEIGHING_SCALES', 'Patient weighing scales', id FROM stock_categories WHERE name = 'MEDICAL_EQUIPMENT';

-- Insert subcategories for SUPPLIES
INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'BANDAGES', 'Bandages and wound care supplies', id FROM stock_categories WHERE name = 'SUPPLIES';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'GLOVES', 'Medical gloves and protective equipment', id FROM stock_categories WHERE name = 'SUPPLIES';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'MASKS', 'Medical masks and respiratory protection', id FROM stock_categories WHERE name = 'SUPPLIES';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'GAUZE', 'Gauze and dressing materials', id FROM stock_categories WHERE name = 'SUPPLIES';

-- Insert subcategories for DIAGNOSTIC_SUPPLIES
INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'TEST_STRIPS', 'Diagnostic test strips', id FROM stock_categories WHERE name = 'DIAGNOSTIC_SUPPLIES';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'LAB_TUBES', 'Laboratory test tubes and containers', id FROM stock_categories WHERE name = 'DIAGNOSTIC_SUPPLIES';

INSERT INTO stock_categories (name, description, parent_category_id) 
SELECT 'SWABS', 'Medical swabs and collection devices', id FROM stock_categories WHERE name = 'DIAGNOSTIC_SUPPLIES';

-- Insert sample stock items
INSERT INTO stock_items (name, description, category_id, sku, unit_of_measure, unit_price, cost_price, selling_price, minimum_stock_level, current_stock, reorder_level, location, is_controlled_substance, requires_prescription, created_by)
SELECT 
    'Disposable Syringes 5ml',
    'Sterile disposable syringes 5ml with needles',
    sc.id,
    'SYR-5ML-001',
    'pieces',
    2.50,
    1.80,
    3.00,
    50,
    200,
    75,
    'Storage Room A',
    false,
    false,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM stock_categories sc WHERE sc.name = 'SYRINGES';

INSERT INTO stock_items (name, description, category_id, sku, unit_of_measure, unit_price, cost_price, selling_price, minimum_stock_level, current_stock, reorder_level, location, is_controlled_substance, requires_prescription, created_by)
SELECT 
    'Paracetamol 500mg Tablets',
    'Paracetamol 500mg tablets, 100 tablets per box',
    sc.id,
    'MED-PAR-500-001',
    'boxes',
    15.00,
    12.00,
    18.00,
    10,
    25,
    15,
    'Pharmacy Storage',
    false,
    true,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM stock_categories sc WHERE sc.name = 'MEDICATIONS';

INSERT INTO stock_items (name, description, category_id, sku, unit_of_measure, unit_price, cost_price, selling_price, minimum_stock_level, current_stock, reorder_level, location, is_controlled_substance, requires_prescription, created_by)
SELECT 
    'Nitrile Gloves Medium',
    'Disposable nitrile gloves, medium size, 100 pieces per box',
    sc.id,
    'GLO-NIT-M-001',
    'boxes',
    8.00,
    6.00,
    10.00,
    20,
    45,
    30,
    'Supply Room',
    false,
    false,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM stock_categories sc WHERE sc.name = 'GLOVES';

INSERT INTO stock_items (name, description, category_id, sku, unit_of_measure, unit_price, cost_price, selling_price, minimum_stock_level, current_stock, reorder_level, location, is_controlled_substance, requires_prescription, created_by)
SELECT 
    'Digital Thermometer',
    'Digital oral/rectal thermometer with LCD display',
    sc.id,
    'THR-DIG-001',
    'pieces',
    25.00,
    18.00,
    30.00,
    5,
    8,
    7,
    'Equipment Room',
    false,
    false,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM stock_categories sc WHERE sc.name = 'THERMOMETERS';

INSERT INTO stock_items (name, description, category_id, sku, unit_of_measure, unit_price, cost_price, selling_price, minimum_stock_level, current_stock, reorder_level, location, is_controlled_substance, requires_prescription, created_by)
SELECT 
    'Blood Pressure Cuff',
    'Standard adult blood pressure cuff for manual BP measurement',
    sc.id,
    'BP-CUFF-ADULT-001',
    'pieces',
    35.00,
    25.00,
    45.00,
    3,
    5,
    4,
    'Equipment Room',
    false,
    false,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM stock_categories sc WHERE sc.name = 'BLOOD_PRESSURE_MONITORS';

-- Create indexes for better performance
CREATE INDEX idx_stock_items_category ON stock_items(category_id);
CREATE INDEX idx_stock_items_sku ON stock_items(sku);
CREATE INDEX idx_stock_items_barcode ON stock_items(barcode);
CREATE INDEX idx_stock_items_current_stock ON stock_items(current_stock);
CREATE INDEX idx_stock_items_reorder_level ON stock_items(reorder_level);
CREATE INDEX idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_adjustments_item ON stock_adjustments(stock_item_id);
CREATE INDEX idx_stock_alerts_item ON stock_alerts(stock_item_id);
CREATE INDEX idx_stock_alerts_resolved ON stock_alerts(is_resolved);
CREATE INDEX idx_stock_requests_status ON stock_requests(status);
CREATE INDEX idx_stock_requests_date ON stock_requests(request_date);
CREATE INDEX idx_stock_categories_parent ON stock_categories(parent_category_id);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_categories_updated_at BEFORE UPDATE ON stock_categories FOR EACH ROW EXECUTE FUNCTION update_stock_updated_at();
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items FOR EACH ROW EXECUTE FUNCTION update_stock_updated_at();
CREATE TRIGGER update_stock_suppliers_updated_at BEFORE UPDATE ON stock_suppliers FOR EACH ROW EXECUTE FUNCTION update_stock_updated_at();
CREATE TRIGGER update_stock_purchases_updated_at BEFORE UPDATE ON stock_purchases FOR EACH ROW EXECUTE FUNCTION update_stock_updated_at();

-- Create trigger for automatic stock level updates
CREATE OR REPLACE FUNCTION update_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current stock based on movement type
    IF NEW.movement_type = 'IN' THEN
        UPDATE stock_items 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.stock_item_id;
    ELSIF NEW.movement_type = 'OUT' THEN
        UPDATE stock_items 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.stock_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_levels_trigger 
    AFTER INSERT ON stock_movements 
    FOR EACH ROW EXECUTE FUNCTION update_stock_levels();

-- Create trigger for low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock is below reorder level
    IF NEW.current_stock <= NEW.reorder_level THEN
        INSERT INTO stock_alerts (stock_item_id, alert_type, current_stock, threshold_value, message)
        VALUES (
            NEW.id,
            'LOW_STOCK',
            NEW.current_stock,
            NEW.reorder_level,
            'Stock level for ' || NEW.name || ' is below reorder level (' || NEW.reorder_level || ')'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_low_stock_trigger 
    AFTER UPDATE ON stock_items 
    FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- Create view for stock summary
CREATE VIEW stock_summary AS
SELECT 
    si.id,
    si.name,
    si.sku,
    sc.name as category_name,
    si.unit_of_measure,
    si.current_stock,
    si.minimum_stock_level,
    si.reorder_level,
    si.unit_price,
    si.cost_price,
    si.selling_price,
    si.location,
    si.is_active,
    CASE 
        WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
        WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
        WHEN si.current_stock <= si.minimum_stock_level THEN 'CRITICAL_STOCK'
        ELSE 'IN_STOCK'
    END as stock_status,
    (si.current_stock * si.cost_price) as total_cost_value,
    (si.current_stock * si.selling_price) as total_selling_value
FROM stock_items si
JOIN stock_categories sc ON si.category_id = sc.id
WHERE si.is_active = true;

-- Create view for low stock items
CREATE VIEW low_stock_items AS
SELECT 
    si.id,
    si.name,
    si.sku,
    sc.name as category_name,
    si.current_stock,
    si.reorder_level,
    si.minimum_stock_level,
    si.location,
    CASE 
        WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
        WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
        ELSE 'CRITICAL_STOCK'
    END as alert_level
FROM stock_items si
JOIN stock_categories sc ON si.category_id = sc.id
WHERE si.is_active = true 
AND si.current_stock <= si.reorder_level;

COMMENT ON TABLE stock_categories IS 'Categories for organizing stock items (medications, tools, equipment, etc.)';
COMMENT ON TABLE stock_items IS 'Individual stock items with details like quantities, prices, and locations';
COMMENT ON TABLE stock_movements IS 'All stock movements (in, out, adjustments) for audit trail';
COMMENT ON TABLE stock_adjustments IS 'Manual stock adjustments with approval workflow';
COMMENT ON TABLE stock_alerts IS 'Low stock and expiry alerts for inventory management';
COMMENT ON TABLE stock_requests IS 'Internal stock requests from staff members';
COMMENT ON TABLE stock_suppliers IS 'Suppliers for stock purchases';
COMMENT ON TABLE stock_purchases IS 'Purchase orders for restocking inventory';
