-- =============================================
-- SQL สำหรับสร้างตาราง product_split_recipes
-- ใช้ใน Supabase SQL Editor
-- =============================================

-- สร้างตาราง product_split_recipes
CREATE TABLE IF NOT EXISTS product_split_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_per_parent INT NOT NULL,  -- เช่น 1 กระสอบ 50กก. = 50 ถุง 1กก.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_product_id, child_product_id)
);

-- Index สำหรับค้นหาเร็ว
CREATE INDEX IF NOT EXISTS idx_split_recipes_parent ON product_split_recipes(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_split_recipes_child ON product_split_recipes(child_product_id);

-- Enable RLS (Row Level Security)
ALTER TABLE product_split_recipes ENABLE ROW LEVEL SECURITY;

-- Policy อนุญาตทุกคน (สำหรับ dev, production ควรปรับ)
CREATE POLICY "Allow all access" ON product_split_recipes FOR ALL USING (true);

-- =============================================
-- ตัวอย่างการใช้งาน:
-- INSERT INTO product_split_recipes (parent_product_id, child_product_id, quantity_per_parent)
-- VALUES ('uuid-ของ-ปุ๋ยกระสอบ', 'uuid-ของ-ปุ๋ยถุง', 50);
-- =============================================
