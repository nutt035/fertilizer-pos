-- ===============================================
-- Base Schema for Fertilizer POS
-- Run this on local Supabase first
-- ===============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 1. Master Tables (ตารางหลัก)
-- ===============================================

-- สาขา
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    phone TEXT,
    tax_id TEXT,
    receipt_header TEXT,
    receipt_footer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- หมวดหมู่หลัก
CREATE TABLE IF NOT EXISTS master_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- หมวดหมู่ย่อย
CREATE TABLE IF NOT EXISTS master_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES master_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- หน่วยนับ
CREATE TABLE IF NOT EXISTS master_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 2. Products & Inventory
-- ===============================================

-- สินค้า
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT,
    size TEXT,
    description TEXT,
    image_url TEXT,
    cost NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    category_id UUID REFERENCES master_categories(id),
    subcategory_id UUID REFERENCES master_subcategories(id),
    unit_id UUID REFERENCES master_units(id),
    is_active BOOLEAN DEFAULT TRUE,
    min_stock_level INT DEFAULT 0,
    is_alert_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- บาร์โค้ดสินค้า
CREATE TABLE IF NOT EXISTS product_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สต็อก
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    remainder_kg NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

-- ประวัติการเคลื่อนไหวสต็อก
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    product_id UUID REFERENCES products(id),
    type TEXT NOT NULL, -- 'IN', 'OUT', 'SALE', 'SPLIT', 'ADJUST'
    quantity NUMERIC NOT NULL,
    balance_after NUMERIC,
    reason TEXT,
    ref_type TEXT,
    ref_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lot สินค้า (วันหมดอายุ)
CREATE TABLE IF NOT EXISTS product_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    product_id UUID REFERENCES products(id),
    lot_number TEXT,
    quantity NUMERIC DEFAULT 0,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สูตรการแบ่งสินค้า
CREATE TABLE IF NOT EXISTS product_split_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_product_id UUID REFERENCES products(id),
    child_product_id UUID REFERENCES products(id),
    quantity_per_parent NUMERIC DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 3. Customers
-- ===============================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nickname TEXT,
    phone TEXT,
    line_id TEXT,
    points NUMERIC DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 4. Orders
-- ===============================================

-- คำสั่งซื้อ
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    customer_id UUID REFERENCES customers(id),
    receipt_no TEXT,
    total_amount NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    cash_received NUMERIC DEFAULT 0,
    change_amount NUMERIC DEFAULT 0,
    slip_image TEXT,
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- รายการสินค้าในคำสั่งซื้อ
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    cost NUMERIC DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ลำดับเลขที่ใบเสร็จ
CREATE TABLE IF NOT EXISTS receipt_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    prefix TEXT,
    year_month TEXT,
    last_sequence INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 5. Transfers (โอนสต็อกระหว่างสาขา)
-- ===============================================

CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_branch_id UUID REFERENCES branches(id),
    to_branch_id UUID REFERENCES branches(id),
    status TEXT DEFAULT 'PENDING',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 6. Config & Users
-- ===============================================

-- ตั้งค่าระบบแต้ม
CREATE TABLE IF NOT EXISTS points_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    points_per_baht NUMERIC DEFAULT 1,
    min_spend_for_points NUMERIC DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ผู้ใช้งาน
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'staff',
    branch_id UUID REFERENCES branches(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 7. Enable RLS (ถ้าต้องการ)
-- ===============================================

-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- etc.

-- ===============================================
-- Done! รัน migrations เพิ่มเติมต่อ
-- ===============================================
