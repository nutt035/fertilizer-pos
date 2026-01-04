-- เพิ่ม column remainder_kg สำหรับเก็บเศษที่เหลือจากการแบ่งขาย
-- ใช้กับสินค้าประเภทกระสอบที่แบ่งขายเป็นกิโล

ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS remainder_kg DECIMAL(10,2) DEFAULT 0;

-- เพิ่ม comment อธิบาย
COMMENT ON COLUMN public.inventory.remainder_kg IS 'เศษที่เหลือจากการแบ่งขาย (กก.) เช่น ถ้าถุง 50กก. แบ่งขายไป 30กก. จะเหลือเศษ 20กก.';
