-- Migration: Add size field to products
-- เพิ่มช่องขนาดสินค้า เช่น "50 กก.", "1 ลิตร"

ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT;

-- Comment for documentation
COMMENT ON COLUMN products.size IS 'ขนาดสินค้า เช่น 50 กก., 1 ลิตร, 100 ซีซี';
