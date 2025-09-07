-- Create user_presence table for tracking user online status and activity
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_page VARCHAR(200),
    current_activity VARCHAR(200),
    is_typing BOOLEAN DEFAULT false,
    typing_entity_id VARCHAR(100),
    typing_entity_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_current_page ON user_presence(current_page);
CREATE INDEX IF NOT EXISTS idx_user_presence_current_activity ON user_presence(current_activity);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_typing ON user_presence(is_typing);
CREATE INDEX IF NOT EXISTS idx_user_presence_typing_entity ON user_presence(typing_entity_id, typing_entity_type);
CREATE INDEX IF NOT EXISTS idx_user_presence_status_last_seen ON user_presence(status, last_seen);

-- Add trigger for updating updated_at column
CREATE OR REPLACE FUNCTION update_user_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_presence_updated_at
    BEFORE UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_user_presence_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_presence IS 'Tracks user online status, current activity, and real-time collaboration state';
COMMENT ON COLUMN user_presence.user_id IS 'ID of the user whose presence is being tracked';
COMMENT ON COLUMN user_presence.status IS 'Current online status of the user';
COMMENT ON COLUMN user_presence.last_seen IS 'Last time the user was active';
COMMENT ON COLUMN user_presence.current_page IS 'Current page the user is viewing';
COMMENT ON COLUMN user_presence.current_activity IS 'Current activity the user is performing';
COMMENT ON COLUMN user_presence.is_typing IS 'Whether the user is currently typing';
COMMENT ON COLUMN user_presence.typing_entity_id IS 'ID of the entity the user is typing in';
COMMENT ON COLUMN user_presence.typing_entity_type IS 'Type of entity the user is typing in';
COMMENT ON COLUMN user_presence.created_at IS 'When the presence record was created';
