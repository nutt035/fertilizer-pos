-- Users table for simple PIN-based login
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier', -- 'owner' or 'cashier'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (name, pin, role) VALUES 
    ('เจ้าของร้าน', '1234', 'owner'),
    ('พนักงาน 1', '0000', 'cashier')
ON CONFLICT DO NOTHING;

-- Create index for PIN lookup
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin) WHERE is_active = true;
