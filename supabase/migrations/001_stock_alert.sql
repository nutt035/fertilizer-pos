-- Stock Alert Feature Migration
-- Run this in Supabase SQL Editor

-- Add min_stock_level column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;

-- Add is_alert_active column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_alert_active BOOLEAN DEFAULT true;

-- Create index for faster stock alert queries
CREATE INDEX IF NOT EXISTS idx_products_min_stock ON products(min_stock_level) 
WHERE is_alert_active = true;
