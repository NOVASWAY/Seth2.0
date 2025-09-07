-- Create event_logs table for comprehensive system event tracking
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_target_type ON event_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_action ON event_logs(action);
CREATE INDEX IF NOT EXISTS idx_event_logs_severity ON event_logs(severity);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_action ON event_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_event_logs_type_created ON event_logs(event_type, created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_event_logs_type_severity_created ON event_logs(event_type, severity, created_at);

-- Add comments for documentation
COMMENT ON TABLE event_logs IS 'Comprehensive event logging for system activities, user actions, and security events';
COMMENT ON COLUMN event_logs.event_type IS 'Type of event (LOGIN, USER, PATIENT, SYSTEM, SECURITY, AUDIT)';
COMMENT ON COLUMN event_logs.user_id IS 'ID of the user who performed the action (nullable for system events)';
COMMENT ON COLUMN event_logs.username IS 'Username for quick reference (denormalized for performance)';
COMMENT ON COLUMN event_logs.target_type IS 'Type of entity affected (user, patient, visit, etc.)';
COMMENT ON COLUMN event_logs.target_id IS 'ID of the entity affected';
COMMENT ON COLUMN event_logs.action IS 'Specific action performed (login, create, update, delete, etc.)';
COMMENT ON COLUMN event_logs.details IS 'Additional event details in JSON format';
COMMENT ON COLUMN event_logs.ip_address IS 'IP address of the client (for security tracking)';
COMMENT ON COLUMN event_logs.user_agent IS 'User agent string (for security tracking)';
COMMENT ON COLUMN event_logs.severity IS 'Event severity level for filtering and alerting';
COMMENT ON COLUMN event_logs.created_at IS 'Timestamp when the event occurred';
