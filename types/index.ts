// types/index.ts

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  image_url: string | null;
  cost: number;
  price: number;
  category_id: string;
  unit_id: string;
  is_active: boolean;
  created_at?: string;
  // Stock Alert fields
  min_stock_level?: number;
  is_alert_active?: boolean;
  // Fields ที่มาจากการ Join ตารางอื่น
  inventory?: { quantity: number }[];
  master_categories?: { name: string } | null;
  master_units?: { name: string } | null;
  product_barcodes?: { barcode: string }[];
}

export interface CartItem extends Product {
  quantity: number;
  note?: string;
  // Helper fields สำหรับแสดงผล UI
  stock: number;      // จำนวนคงเหลือที่แงะออกมาจาก inventory array แล้ว
  category: string;   // ชื่อหมวดหมู่
  unit: string;       // ชื่อหน่วย
  barcode: string;    // บาร์โค้ดแรกที่เจอ
  product_barcodes?: { barcode: string }[]; // เก็บไว้ค้นหา
  // Discount fields
  discountAmount?: number;
  discountType?: 'percent' | 'fixed' | null;
}

export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  phone?: string;
  line_id?: string;
  points?: number;
  total_spent?: number;
  created_at?: string;
}

// Order related types
export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  price: number;
  cost?: number;
  subtotal?: number;
  products?: { name: string };
}

export interface Order {
  id: string;
  receipt_no: string;
  branch_id: string;
  customer_id?: string;
  grand_total: number;
  payment_method: 'cash' | 'transfer';
  cash_received?: number;
  change_amount?: number;
  slip_image?: string;
  status: 'COMPLETED' | 'VOID';
  created_at: string;
  customers?: Customer | null;
  order_items?: OrderItem[];
}

// Branch type
export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  tax_id?: string;
  receipt_header?: string;
  receipt_footer?: string;
}

// Stock page specific types
export interface StockProduct extends Product {
  stock: number;
  category: string;
  unit: string;
  barcode: string;
  min_stock_level?: number;
  is_alert_active?: boolean;
}

export interface SplitRecipe {
  id: string;
  parent_product_id: string;
  child_product_id: string;
  quantity_per_parent: number;
  is_active?: boolean;
  parent_product?: { id: string; name: string; sku?: string };
  child_product?: { id: string; name: string; sku?: string };
}

export interface MasterData {
  id: string;
  name: string;
}