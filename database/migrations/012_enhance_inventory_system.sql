-- Enhance existing inventory system with comprehensive features
-- Add missing columns to inventory_items table

-- Add item code if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='item_code') THEN
        ALTER TABLE inventory_items ADD COLUMN item_code VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- Add cost and selling prices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='cost_price_per_unit') THEN
        ALTER TABLE inventory_items ADD COLUMN cost_price_per_unit DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='selling_price_per_unit') THEN
        ALTER TABLE inventory_items ADD COLUMN selling_price_per_unit DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Add supplier details
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='supplier_details') THEN
        ALTER TABLE inventory_items ADD COLUMN supplier_details TEXT;
    END IF;
END $$;

-- Add quantity available (current stock)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='quantity_available') THEN
        ALTER TABLE inventory_items ADD COLUMN quantity_available INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add minimum and maximum stock levels
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='minimum_stock_level') THEN
        ALTER TABLE inventory_items ADD COLUMN minimum_stock_level INTEGER DEFAULT 10;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='maximum_stock_level') THEN
        ALTER TABLE inventory_items ADD COLUMN maximum_stock_level INTEGER DEFAULT 1000;
    END IF;
END $$;

-- Create stock movements table for tracking all inventory movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id),
    batch_id UUID REFERENCES inventory_batches(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'EXPIRED', 'DAMAGED')),
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    reference VARCHAR(100), -- OP number for patients, receipt number for non-patients
    patient_id UUID REFERENCES patients(id),
    invoice_id UUID REFERENCES invoices(id),
    receipt_number VARCHAR(50),
    dispensed_by UUID REFERENCES users(id),
    dispensed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create dispensing records table for complete dispensing history
CREATE TABLE IF NOT EXISTS dispensing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('PATIENT', 'NON_PATIENT')),
    
    -- Patient dispensing fields
    op_number VARCHAR(50),
    patient_id UUID REFERENCES patients(id),
    diagnosis TEXT,
    invoice_id UUID REFERENCES invoices(id),
    service_given TEXT,
    
    -- Non-patient dispensing fields
    receipt_number VARCHAR(50),
    buyer_name VARCHAR(200),
    contact_info VARCHAR(100),
    
    -- Common fields
    items JSONB NOT NULL, -- Array of dispensed items with details
    total_amount DECIMAL(10,2) NOT NULL,
    dispensed_by UUID REFERENCES users(id),
    dispensed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create price history table for tracking price changes
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id),
    old_cost_price DECIMAL(10,2),
    new_cost_price DECIMAL(10,2),
    old_selling_price DECIMAL(10,2),
    new_selling_price DECIMAL(10,2),
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_dispensed_at ON stock_movements(dispensed_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_patient_id ON stock_movements(patient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_receipt_number ON stock_movements(receipt_number);

CREATE INDEX IF NOT EXISTS idx_dispensing_records_type ON dispensing_records(type);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_patient_id ON dispensing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_op_number ON dispensing_records(op_number);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_receipt_number ON dispensing_records(receipt_number);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_dispensed_at ON dispensing_records(dispensed_at);

CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at);

-- Create triggers for automatic stock updates
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update inventory_items quantity_available
    UPDATE inventory_items 
    SET quantity_available = NEW.new_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.item_id;
    
    -- Update batch quantity if batch_id is provided
    IF NEW.batch_id IS NOT NULL THEN
        UPDATE inventory_batches 
        SET quantity = NEW.new_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.batch_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_movement
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_movement();

-- Create function to prevent negative stock
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_available < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative. Current stock: %, Attempted: %', 
            OLD.quantity_available, NEW.quantity_available;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_negative_stock
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    WHEN (OLD.quantity_available IS DISTINCT FROM NEW.quantity_available)
    EXECUTE FUNCTION prevent_negative_stock();

-- Create views for reporting
CREATE OR REPLACE VIEW inventory_stock_summary AS
SELECT 
    ii.id,
    ii.name as item_name,
    ii.item_code,
    ii.category,
    ii.unit,
    ii.quantity_available,
    ii.minimum_stock_level,
    ii.maximum_stock_level,
    ii.cost_price_per_unit,
    ii.selling_price_per_unit,
    ii.supplier_details,
    (ii.quantity_available * ii.cost_price_per_unit) as total_cost_value,
    (ii.quantity_available * ii.selling_price_per_unit) as total_selling_value,
    CASE 
        WHEN ii.quantity_available <= ii.minimum_stock_level THEN 'LOW_STOCK'
        WHEN ii.quantity_available >= ii.maximum_stock_level THEN 'OVERSTOCKED'
        ELSE 'NORMAL'
    END as stock_status,
    ib.expiry_date,
    CASE 
        WHEN ib.expiry_date < CURRENT_DATE THEN true
        ELSE false
    END as is_expired,
    (ib.expiry_date - CURRENT_DATE) as days_to_expiry
FROM inventory_items ii
LEFT JOIN inventory_batches ib ON ii.id = ib.inventory_item_id
WHERE ii.is_active = true;

-- Create view for stock movements with item details
CREATE OR REPLACE VIEW stock_movement_details AS
SELECT 
    sm.id,
    sm.movement_type,
    sm.quantity,
    sm.previous_quantity,
    sm.new_quantity,
    sm.unit_price,
    sm.total_value,
    sm.reason,
    sm.reference,
    sm.dispensed_at,
    ii.name as item_name,
    ii.item_code,
    ii.unit,
    p.first_name || ' ' || p.last_name as patient_name,
    p.op_number,
    u.username as dispensed_by_name
FROM stock_movements sm
JOIN inventory_items ii ON sm.item_id = ii.id
LEFT JOIN patients p ON sm.patient_id = p.id
LEFT JOIN users u ON sm.dispensed_by = u.id
ORDER BY sm.dispensed_at DESC;

-- Create view for dispensing summary
CREATE OR REPLACE VIEW dispensing_summary AS
SELECT 
    dr.id,
    dr.type,
    dr.op_number,
    dr.patient_id,
    dr.receipt_number,
    dr.buyer_name,
    dr.total_amount,
    dr.dispensed_at,
    p.first_name || ' ' || p.last_name as patient_name,
    u.username as dispensed_by_name,
    jsonb_array_length(dr.items) as item_count
FROM dispensing_records dr
LEFT JOIN patients p ON dr.patient_id = p.id
LEFT JOIN users u ON dr.dispensed_by = u.id
ORDER BY dr.dispensed_at DESC;

-- Update existing inventory_items with default values if needed
UPDATE inventory_items 
SET 
    item_code = COALESCE(item_code, 'ITEM' || EXTRACT(EPOCH FROM created_at)::bigint),
    cost_price_per_unit = COALESCE(cost_price_per_unit, 0),
    selling_price_per_unit = COALESCE(selling_price_per_unit, 0),
    quantity_available = COALESCE(quantity_available, 0),
    minimum_stock_level = COALESCE(minimum_stock_level, 10),
    maximum_stock_level = COALESCE(maximum_stock_level, 1000)
WHERE item_code IS NULL OR cost_price_per_unit IS NULL OR selling_price_per_unit IS NULL;

-- Create sample inventory data for testing
INSERT INTO inventory_items (
    name, item_code, category, unit, quantity_available,
    cost_price_per_unit, selling_price_per_unit, supplier_details,
    minimum_stock_level, maximum_stock_level, created_by
) VALUES 
    ('Paracetamol 500mg Tablets', 'PARA500', 'Analgesics', 'tablets', 200, 5.00, 10.00, 'Pharma Ltd, +254 700 000 000', 20, 500, (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)),
    ('Amoxicillin 250mg Capsules', 'AMOX250', 'Antibiotics', 'capsules', 150, 8.00, 15.00, 'MedSupply Co, +254 711 000 000', 15, 300, (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)),
    ('Ibuprofen 200mg Tablets', 'IBU200', 'Analgesics', 'tablets', 100, 6.00, 12.00, 'HealthCare Supplies, +254 722 000 000', 10, 200, (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1))
ON CONFLICT (item_code) DO NOTHING;

-- Create corresponding batches for sample items
INSERT INTO inventory_batches (
    inventory_item_id, batch_number, quantity, original_quantity,
    unit_cost, selling_price, expiry_date, supplier_name, received_by
) 
SELECT 
    ii.id,
    'BATCH' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint,
    ii.quantity_available,
    ii.quantity_available,
    ii.cost_price_per_unit,
    ii.selling_price_per_unit,
    CURRENT_DATE + INTERVAL '2 years',
    SPLIT_PART(ii.supplier_details, ',', 1),
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
FROM inventory_items ii
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_batches ib WHERE ib.inventory_item_id = ii.id
);

-- Grant permissions to relevant users
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_items TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_batches TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_movements TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dispensing_records TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON price_history TO postgres;

GRANT SELECT ON inventory_stock_summary TO postgres;
GRANT SELECT ON stock_movement_details TO postgres;
GRANT SELECT ON dispensing_summary TO postgres;
