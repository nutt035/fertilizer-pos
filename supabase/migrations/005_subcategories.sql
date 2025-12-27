-- เพิ่มตาราง master_subcategories สำหรับหมวดหมู่ย่อย
CREATE TABLE IF NOT EXISTS public.master_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.master_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เพิ่มคอลัมน์ subcategory_id ในตาราง products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.master_subcategories(id) ON DELETE SET NULL;

-- เปิดใช้ RLS
ALTER TABLE public.master_subcategories ENABLE ROW LEVEL SECURITY;

-- Policy: อนุญาตให้ทุกคนอ่านได้
CREATE POLICY "Enable read access for all users" ON public.master_subcategories
FOR SELECT TO authenticated, anon
USING (true);

-- Policy: อนุญาตให้ authenticated users แก้ไขได้
CREATE POLICY "Enable all access for authenticated users" ON public.master_subcategories
FOR ALL TO authenticated
USING (true);

-- สร้าง index เพื่อประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.master_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
