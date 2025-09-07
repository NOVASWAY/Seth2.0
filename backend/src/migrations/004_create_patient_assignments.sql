-- Create patient_assignments table for managing patient assignments to users
CREATE TABLE IF NOT EXISTS patient_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL' CHECK (assignment_type IN ('GENERAL', 'PRIMARY_CARE', 'SPECIALIST', 'NURSE', 'PHARMACIST', 'FOLLOW_UP', 'REFERRAL')),
    assignment_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'TRANSFERRED')),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patient_assignments_patient_id ON patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_assigned_to ON patient_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_assigned_by ON patient_assignments(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_status ON patient_assignments(status);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_type ON patient_assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_priority ON patient_assignments(priority);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_due_date ON patient_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_created_at ON patient_assignments(created_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patient_assignments_user_status ON patient_assignments(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_patient_status ON patient_assignments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_type_status ON patient_assignments(assignment_type, status);

-- Add trigger for updating updated_at column
CREATE OR REPLACE FUNCTION update_patient_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_assignments_updated_at
    BEFORE UPDATE ON patient_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_assignments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE patient_assignments IS 'Manages patient assignments to different users for various care purposes';
COMMENT ON COLUMN patient_assignments.patient_id IS 'ID of the patient being assigned';
COMMENT ON COLUMN patient_assignments.assigned_to_user_id IS 'ID of the user the patient is assigned to';
COMMENT ON COLUMN patient_assignments.assigned_by_user_id IS 'ID of the user who made the assignment';
COMMENT ON COLUMN patient_assignments.assignment_type IS 'Type of assignment (GENERAL, PRIMARY_CARE, SPECIALIST, etc.)';
COMMENT ON COLUMN patient_assignments.assignment_reason IS 'Reason for the assignment';
COMMENT ON COLUMN patient_assignments.status IS 'Current status of the assignment';
COMMENT ON COLUMN patient_assignments.priority IS 'Priority level of the assignment';
COMMENT ON COLUMN patient_assignments.assigned_at IS 'When the assignment was made';
COMMENT ON COLUMN patient_assignments.completed_at IS 'When the assignment was completed';
COMMENT ON COLUMN patient_assignments.due_date IS 'Optional due date for the assignment';
COMMENT ON COLUMN patient_assignments.notes IS 'Additional notes about the assignment';
