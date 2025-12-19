-- Product Expiry Date Migration
-- Run this in Supabase SQL Editor

-- Add expiry_date to products (สำหรับสินค้าที่มีวันหมดอายุ เช่น ยา ปุ๋ย)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS expiry_date DATE DEFAULT NULL;

-- Optional: Add batch/lot tracking table for multiple expiry dates per product
CREATE TABLE IF NOT EXISTS product_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    lot_number VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0,
    expiry_date DATE NOT NULL,
    received_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_product_lots_expiry ON product_lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date) WHERE expiry_date IS NOT NULL;
