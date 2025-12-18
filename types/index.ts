// types/index.ts

export interface Product {
  id: string;
  name: string;
  description?: string;
  image_url: string | null;
  cost: number;
  price: number;
  category_id: string;
  unit_id: string;
  is_active: boolean;
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
}

export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  phone?: string;
  points: number;
  total_spent: number;
}