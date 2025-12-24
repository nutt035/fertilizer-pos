'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../lib/supabase';
import { CartItem, Customer } from '../types';
import { Search, Trash2, RotateCcw, Banknote, ShoppingCart, Pencil, PauseCircle, Save, History, Loader2, User } from 'lucide-react';
import useBranchSettings from '../hooks/useBranchSettings';

// Components
import { SearchInput } from '../components/common';
import {
  CustomerSelectModal,
  PaymentModal,
  HeldBillsModal,
  ProductCard,
  CartItemRow,
  ReceiptPrint,
  ReceiptData,
  DiscountModal
} from '../components/pos';

interface HeldBill {
  id: number;
  items: CartItem[];
  customer: Customer | null;
  total: number;
  time: string;
}

export default function POSPage() {
  // --- ข้อมูลร้าน/สาขา (แก้ไขได้ที่ Settings > ข้อมูลร้าน) ---
  const { settings: branchSettings } = useBranchSettings();

  // --- State: สินค้า & ตะกร้า ---
  const [products, setProducts] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // --- Refs: ช่องยิงบาร์โค้ด (ล็อกโฟกัส) ---
  const scanInputRef = useRef<HTMLInputElement>(null);
  const focusScan = () => {
    // setTimeout(0) เพื่อให้ทำงานหลัง render/close modal แล้ว
    setTimeout(() => scanInputRef.current?.focus(), 0);
  };

  // --- State: ลูกค้า ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // --- State: Modal ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);

  // --- State: Note ---
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  // --- State: Receipt ---
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // --- State: Bill Discount ---
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountTargetItem, setDiscountTargetItem] = useState<CartItem | null>(null);

  // คำนวณยอดรวม (with discounts)
  const calculateItemTotal = (item: CartItem) => {
    const basePrice = item.price * item.quantity;
    if (!item.discountAmount || !item.discountType) return basePrice;
    if (item.discountType === 'percent') {
      return basePrice - (basePrice * item.discountAmount / 100);
    }
    return basePrice - item.discountAmount;
  };

  const subtotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const billDiscountAmount = billDiscountType === 'percent'
    ? (subtotal * billDiscount / 100)
    : billDiscount;

  const totalAmount = subtotal - billDiscountAmount;

  // Keyboard shortcuts (ร้านจริง)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

      // F2 = โฟกัสช่องยิงบาร์โค้ด
      if (e.key === 'F2') {
        e.preventDefault();
        focusScan();
        return;
      }

      // F9 = เปิดรับเงิน (ถ้ามีของในตะกร้า)
      if (e.key === 'F9') {
        if (cart.length > 0 && !isPaymentModalOpen) {
          e.preventDefault();
          setIsPaymentModalOpen(true);
        }
        return;
      }

      // ESC = ปิด modal ทั้งหมด
      if (e.key === 'Escape') {
        if (isCustomerModalOpen || isHeldBillsModalOpen || isPaymentModalOpen || isDiscountModalOpen) {
          e.preventDefault();
          setIsCustomerModalOpen(false);
          setIsHeldBillsModalOpen(false);
          setIsPaymentModalOpen(false);
          setIsDiscountModalOpen(false);
          focusScan();
        }
        return;
      }

      // / = โฟกัสช่องค้นหา (เหมือนเดิม แต่ชี้ไปช่องยิงด้วย ref)
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        focusScan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isCustomerModalOpen, isHeldBillsModalOpen, isPaymentModalOpen, isDiscountModalOpen]);

  // --- 1. Load Data ---
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchCategories();
    // ให้โฟกัสช่องยิงตั้งแต่เข้า page
    focusScan();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select(`
                *,
                master_categories (name),
                master_units (name),
                product_barcodes (barcode),
                inventory (quantity)
            `)
      .eq('is_active', true)
      .eq('inventory.branch_id', CURRENT_BRANCH_ID);

    if (error) {
      console.error('Error products:', error);
      alert('โหลดสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      const formatted: CartItem[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image_url: p.image_url,
        cost: p.cost,
        price: p.price,
        category_id: p.category_id,
        unit_id: p.unit_id,
        is_active: p.is_active,
        quantity: 0,
        category: p.master_categories?.name || 'ทั่วไป',
        unit: p.master_units?.name || 'ชิ้น',
        stock: p.inventory?.[0]?.quantity || 0,
        barcode: p.product_barcodes?.[0]?.barcode || '',
        product_barcodes: p.product_barcodes
      }));
      setProducts(formatted);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) console.error('Error customers:', error);
    else setCustomers(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('master_categories').select('*').order('name');
    if (error) console.error('Error categories:', error);
    else setCategories(data || []);
  };

  // --- 2. Customer Logic ---
  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    // ปิด modal แล้วโฟกัสช่องยิงกลับ
    setIsCustomerModalOpen(false);
    focusScan();
  };

  const handleAddCustomer = async (name: string, nickname: string) => {
    const { data, error } = await supabase.from('customers').insert({
      name: name,
      nickname: nickname || name
    }).select().single();

    if (error) throw error;

    setCustomers(prev => [...prev, data]);
    setSelectedCustomer(data);
    setIsCustomerModalOpen(false);
    alert(`ยินดีต้อนรับคุณ ${data.nickname || data.name}`);
    focusScan();
  };

  // --- 3. Cart & Scan/Search Logic ---
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      focusScan();
      return;
    }

    // 1) โหมด “สแกนบาร์โค้ด”: ต้อง match เป๊ะก่อน
    const exactBarcodeMatch = products.find(p =>
      p.barcode === term ||
      p.product_barcodes?.some((b: any) => b.barcode === term)
    );

    if (exactBarcodeMatch) {
      handleProductClick(exactBarcodeMatch);
      setSearchTerm('');
      focusScan();
      return;
    }

    // 2) ถ้าไม่เจอแบบเป๊ะ: แจ้งเตือน (ร้านจริงต้องรู้ทันที)
    // (ถ้าคุณอยากให้ Enter แบบพิมพ์ชื่อแล้วเพิ่มสินค้าอัตโนมัติ เดี๋ยวทำโหมดเพิ่มเติมได้)
    alert(`ไม่พบสินค้าจากบาร์โค้ด/รหัส: ${term}\nกรุณาตรวจสอบบาร์โค้ด หรือเพิ่มสินค้าใหม่`);
    setSearchTerm('');
    focusScan();
  };

  const handleProductClick = (product: CartItem) => {
    if (product.stock <= 0) {
      alert('สินค้าหมด! กรุณาเติมของที่หน้าสต็อก');
      focusScan();
      return;
    }
    addToCart(product);
  };

  const addToCart = (product: CartItem) => {
    const currentInCart = cart.find(item => item.id === product.id)?.quantity || 0;
    if (currentInCart + 1 > product.stock) {
      alert('หยิบเกินจำนวนที่มีในสต็อก!');
      focusScan();
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, note: '' }];
    });

    // ยิงต่อได้ทันที
    focusScan();
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      focusScan();
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product && newQty > product.stock) {
      alert('ของไม่พอ!');
      focusScan();
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item))
    );
    focusScan();
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    focusScan();
  };

  // --- Discount Functions ---
  const handleApplyBillDiscount = (amount: number, type: 'percent' | 'fixed') => {
    setBillDiscount(amount);
    setBillDiscountType(type);
    setIsDiscountModalOpen(false);
    focusScan();
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscount(0);
    setBillDiscountType(null);
    setSelectedCustomer(null);
    focusScan();
  };

  // --- 4. Payment Logic ---
  const handleConfirmPayment = async (
    paymentMethod: 'cash' | 'transfer',
    cashReceived: number,
    slipFile: File | null
  ) => {
    try {
      let slipUrl = null;
      if (paymentMethod === 'transfer' && slipFile) {
        const fileExt = slipFile.name.split('.').pop();
        const fileName = `slip_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('slips').upload(fileName, slipFile);
        if (uploadError) throw new Error('อัปโหลดสลิปไม่ผ่าน: ' + uploadError.message);

        const { data } = supabase.storage.from('slips').getPublicUrl(fileName);
        slipUrl = data.publicUrl;
      }

      const itemsPayload = cart.map(item => ({
        product_id: item.id,
        qty: item.quantity,
        price: item.price,
        cost: item.cost || 0
      }));

      const changeAmount = cashReceived - totalAmount;
      const now = new Date();

      const { data, error } = await supabase.rpc('process_checkout', {
        p_branch_id: CURRENT_BRANCH_ID,
        p_customer_id: selectedCustomer?.id || null,
        p_payment_method: paymentMethod,
        p_cash_received: paymentMethod === 'cash' ? cashReceived : 0,
        p_change_amount: paymentMethod === 'cash' ? changeAmount : 0,
        p_slip_image: slipUrl,
        p_items: itemsPayload
      });

      if (error) throw new Error(error.message);

      // เก็บข้อมูลสำหรับปริ้นใบเสร็จ (แบบเดิมของคุณ เพื่อไม่พัง)
      setReceiptData({
        receiptNo: data.receipt_no,
        date: now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        customerName: selectedCustomer ? (selectedCustomer.nickname || selectedCustomer.name) : undefined,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit
        })),
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : undefined,
        changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
        // ข้อมูลร้านจาก Settings (แก้ไขได้ที่ Settings > ข้อมูลร้าน & สาขา)
        shopName: branchSettings.name,
        shopAddress: branchSettings.address,
        shopPhone: branchSettings.phone,
        shopTaxId: branchSettings.tax_id,
        receiptHeader: branchSettings.receipt_header,
        receiptFooter: branchSettings.receipt_footer
      });

      // ปิด Modal ก่อนแล้วปริ้นอัตโนมัติ
      setIsPaymentModalOpen(false);

      // รอให้ receipt data render แล้วค่อยปริ้น
      setTimeout(async () => {
        window.print();

        // เปิดลิ้นชักอัตโนมัติถ้าเป็นเงินสด (ผ่าน print-server)
        if (paymentMethod === 'cash') {
          try {
            await fetch('http://localhost:9100/drawer', { method: 'POST' });
            console.log('✅ Cash drawer opened');
          } catch (err) {
            console.warn('⚠️ ลิ้นชักไม่เปิด - กรุณารัน print-server ก่อน');
          }
        }
      }, 300);

      // Reset State หลังปริ้น
      setCart([]);
      setBillDiscount(0);
      setBillDiscountType(null);
      setSelectedCustomer(null);

      await fetchProducts();
      focusScan();
    } catch (err: any) {
      alert(err?.message || 'ชำระเงินไม่สำเร็จ');
      focusScan();
    }
  };

  const handlePrint = () => {
    window.print();
    focusScan();
  };

  // --- Helpers ---
  const startEditingNote = (item: CartItem) => {
    setEditingNoteId(item.id);
    setTempNote(item.note || '');
  };

  const saveNote = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, note: tempNote } : item))
    );
    setEditingNoteId(null);
    focusScan();
  };


  const holdBill = () => {
    if (cart.length === 0) {
      focusScan();
      return;
    }
    setHeldBills([
      ...heldBills,
      {
        id: Date.now(),
        items: cart,
        customer: selectedCustomer,
        total: totalAmount,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setCart([]);
    setSelectedCustomer(null);
    focusScan();
  };

  const restoreBill = (index: number) => {
    const billToRestore = heldBills[index];
    if (cart.length > 0 && !confirm('เคลียร์หน้าจอเพื่อเรียกบิลเก่า?')) {
      focusScan();
      return;
    }
    setCart(billToRestore.items);
    setSelectedCustomer(billToRestore.customer);
    setHeldBills(heldBills.filter((_, i) => i !== index));
    setIsHeldBillsModalOpen(false);
    focusScan();
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      p.product_barcodes?.some((b: any) => b.barcode.includes(searchTerm));
    const matchCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden font-sans">

      {/* --- ส่วนใบเสร็จสำหรับปริ้น --- */}
      {receiptData && <ReceiptPrint data={receiptData} />}

      {/* --- Section 1: Cart (ตะกร้า) --- */}
      <div className="w-full lg:w-2/5 h-[40vh] lg:h-full bg-white flex flex-col border-r shadow-xl z-10 order-1 lg:order-none">
        {/* Header ตะกร้า */}
        <div className="p-3 lg:p-4 bg-blue-900 text-white shadow-md flex justify-between items-center">
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 lg:w-8 lg:h-8" /> รายการขาย
          </h1>
          <p className="text-blue-200 text-xs lg:text-sm">{new Date().toLocaleDateString('th-TH')}</p>
        </div>

        {/* แถบเลือกลูกค้า */}
        <div className="bg-orange-50 border-b border-orange-100 p-2 lg:p-3 flex justify-between items-center">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="bg-orange-100 p-1 lg:p-2 rounded-full text-orange-600"><User size={20} /></div>
            <div>
              <div className="text-[10px] lg:text-xs text-orange-400 font-bold uppercase">ลูกค้า</div>
              <div className="font-bold text-gray-800 text-base lg:text-lg leading-none truncate max-w-[150px]">
                {selectedCustomer ? (selectedCustomer.nickname || selectedCustomer.name) : 'ลูกค้าทั่วไป'}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setIsCustomerModalOpen(true); }}
            className="bg-white border-2 border-orange-200 text-orange-600 px-3 py-1 lg:px-4 lg:py-2 rounded-lg font-bold text-xs lg:text-sm hover:bg-orange-100 transition"
          >
            เปลี่ยน
          </button>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 lg:mt-20 text-lg lg:text-xl flex flex-col items-center gap-4">
              <ShoppingCart size={48} className="opacity-20" />
              <span>ยิงบาร์โค้ด หรือเลือกสินค้า (F2 โฟกัสช่องยิง)</span>
            </div>
          ) : (
            cart.map((item, index) => (
              <CartItemRow
                key={item.id}
                item={item}
                index={index}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                editingNoteId={editingNoteId}
                tempNote={tempNote}
                onStartEditNote={startEditingNote}
                onSaveNote={saveNote}
                onTempNoteChange={setTempNote}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 lg:p-4 bg-gray-50 border-t-2 border-gray-200">
          <div className="flex justify-between items-end mb-2">
            <span className="text-gray-600 text-base lg:text-lg">รวมสินค้า</span>
            <span className="text-lg lg:text-xl text-gray-600">฿{subtotal.toLocaleString()}</span>
          </div>
          {billDiscountAmount > 0 && (
            <div className="flex justify-between items-end mb-2 text-pink-600">
              <span className="text-base lg:text-lg">ส่วนลด {billDiscountType === 'percent' ? `${billDiscount}%` : ''}</span>
              <span className="text-lg lg:text-xl">-฿{billDiscountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-end mb-2 lg:mb-4">
            <span className="text-gray-800 text-lg lg:text-xl font-bold">ยอดสุทธิ</span>
            <span className="text-3xl lg:text-5xl font-bold text-blue-700">฿{totalAmount.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-2 lg:mb-3">
            <button
              onClick={holdBill}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1 lg:gap-2 bg-yellow-100 text-yellow-800 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-yellow-200 transition border border-yellow-200 disabled:opacity-50"
            >
              <PauseCircle size={18} /> <span className="hidden sm:inline">พักบิล</span>
            </button>

            <button
              onClick={() => setIsHeldBillsModalOpen(true)}
              disabled={heldBills.length === 0}
              className="flex items-center justify-center gap-1 lg:gap-2 bg-purple-100 text-purple-800 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-purple-200 transition border border-purple-200 disabled:opacity-50 relative"
            >
              <History size={18} /> <span className="hidden sm:inline">เรียก</span>
              {heldBills.length > 0 && (
                <span className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-red-500 text-white text-xs w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full border-2 border-white">
                  {heldBills.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setDiscountTargetItem(null); setIsDiscountModalOpen(true); }}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1 lg:gap-2 bg-pink-100 text-pink-800 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-pink-200 transition border border-pink-200 disabled:opacity-50"
            >
              ส่วนลด
            </button>

            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1 lg:gap-2 bg-gray-200 text-gray-700 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-gray-300 transition disabled:opacity-50"
            >
              <RotateCcw size={18} /> <span className="hidden sm:inline">ล้าง</span>
            </button>
          </div>

          <button
            onClick={() => { setIsPaymentModalOpen(true); }}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-3 lg:py-5 rounded-xl text-2xl lg:text-3xl font-bold text-white transition shadow-lg ${cart.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95'
              }`}
          >
            <Banknote size={28} className="lg:w-9 lg:h-9" /> รับเงิน (F9)
          </button>
        </div>
      </div>

      {/* --- Section 2: Shelf (ชั้นวาง) --- */}
      <div className="w-full lg:w-3/5 h-[60vh] lg:h-full p-3 lg:p-6 flex flex-col bg-gray-100 order-2 lg:order-none">
        {/* Header ค้นหา / ยิงบาร์โค้ด */}
        <div className="mb-3 lg:mb-6 flex gap-2 lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={scanInputRef}
              type="text"
              placeholder="ยิงบาร์โค้ด หรือ ค้นหาชื่อ... (F2 โฟกัส)"
              className="w-full pl-10 pr-4 py-2 lg:py-4 text-lg lg:text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2 mb-2 lg:mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {['ทั้งหมด', ...categories.map(c => c.name)].map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); focusScan(); }}
              className={`px-4 py-2 lg:px-6 lg:py-3 rounded-xl text-base lg:text-xl font-bold whitespace-nowrap transition shadow-sm ${selectedCategory === cat
                ? 'bg-blue-600 text-white transform scale-105'
                : 'bg-white text-gray-500 border hover:bg-gray-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 pb-20">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-blue-600 text-xl font-bold gap-3">
              <Loader2 className="animate-spin" size={32} /> กำลังโหลดสินค้า...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={(p: CartItem) => {
                    handleProductClick(p);
                    focusScan();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => { setIsCustomerModalOpen(false); focusScan(); }}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelect={handleSelectCustomer}
        onAddCustomer={handleAddCustomer}
      />

      <HeldBillsModal
        isOpen={isHeldBillsModalOpen}
        onClose={() => { setIsHeldBillsModalOpen(false); focusScan(); }}
        heldBills={heldBills}
        onRestore={restoreBill}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); focusScan(); }}
        totalAmount={totalAmount}
        selectedCustomer={selectedCustomer}
        onConfirmPayment={handleConfirmPayment}
        onPrint={handlePrint}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => { setIsDiscountModalOpen(false); focusScan(); }}
        currentPrice={subtotal}
        currentDiscount={billDiscount}
        currentDiscountType={billDiscountType}
        onApply={handleApplyBillDiscount}
      />

    </div>
  );
}
