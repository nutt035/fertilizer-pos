-- Discount System Migration
-- Run this in Supabase SQL Editor

-- Add discount columns to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) DEFAULT NULL;

-- Add discount total to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10,2) DEFAULT 0;

-- Comment: discount_type can be 'percent' or 'fixed'
