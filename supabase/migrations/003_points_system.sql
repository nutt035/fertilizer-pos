-- Points System Migration
-- Run this in Supabase SQL Editor

-- Orders table - add points columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;

-- Points configuration table
CREATE TABLE IF NOT EXISTS points_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    points_per_baht DECIMAL(5,2) DEFAULT 0.01,  -- 1 point per 100 baht (0.01 * 100 = 1)
    baht_per_point DECIMAL(5,2) DEFAULT 1,       -- 1 point = 1 baht discount
    min_points_redeem INTEGER DEFAULT 100,       -- ต้องมีอย่างน้อย 100 แต้มถึงจะใช้ได้
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO points_config (points_per_baht, baht_per_point, min_points_redeem)
SELECT 0.01, 1, 100
WHERE NOT EXISTS (SELECT 1 FROM points_config LIMIT 1);
