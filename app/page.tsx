'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Trash2, RotateCcw, Banknote, CreditCard, ShoppingCart, Pencil, PauseCircle, Save, History, ArrowRightLeft, Loader2, Upload, Image as ImageIcon, X, User, UserPlus, Check, Printer } from 'lucide-react';

export default function POSPage() {
  // --- State: สินค้า & ตะกร้า ---
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]); 
  const [heldBills, setHeldBills] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  
  // --- State: ลูกค้า ---
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null); // null = ลูกค้าทั่วไป
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerNick, setNewCustomerNick] = useState('');
  
  // --- State: การชำระเงิน ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // --- State: Note ---
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  // ยอดรวม
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const changeAmount = Number(cashReceived) - totalAmount;

  // --- 1. Load Data ---
  useEffect(() => { 
      fetchProducts(); 
      fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) { console.error('Error products:', error); alert('โหลดสินค้าไม่สำเร็จ'); } 
    else { setProducts(data || []); }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) console.error('Error customers:', error);
    else setCustomers(data || []);
  };

  // --- 2. Customer Logic ---
  const handleSelectCustomer = (customer: any) => {
      setSelectedCustomer(customer);
      setIsCustomerModalOpen(false);
      setCustomerSearch('');
  };

  const handleAddCustomer = async () => {
      if (!newCustomerName) return alert('กรุณาใส่ชื่อลูกค้า');
      const { data, error } = await supabase.from('customers').insert({
          name: newCustomerName,
          nickname: newCustomerNick || newCustomerName
      }).select().single();

      if (error) {
          alert('เพิ่มลูกค้าไม่สำเร็จ: ' + error.message);
      } else {
          setCustomers(prev => [...prev, data]);
          setSelectedCustomer(data);
          setIsCustomerModalOpen(false);
          setNewCustomerName('');
          setNewCustomerNick('');
          alert(`ยินดีต้อนรับคุณ ${data.nickname || data.name}`);
      }
  };

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      (c.nickname && c.nickname.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  // --- 3. Cart & Search Logic ---
  // ยิงบาร์โค้ด
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // ค้นหาเป๊ะๆ (Barcode match)
      const exactMatch = products.find(p => 
        p.barcode === searchTerm || 
        p.name === searchTerm || 
        (p.short_code && p.short_code === searchTerm)
      );

      if (exactMatch) {
        handleProductClick(exactMatch);
        setSearchTerm('');
      }
    }
  };

  const handleProductClick = (product: any) => {
    if (product.stock <= 0) {
        if (product.type === 'sub') {
            const parent = products.find(p => p.id === product.parent_id);
            if (parent && confirm(`ของหมด! \nต้องการเบิก "${parent.name}" \nมาแบ่งขายเป็น "${product.name}" ไหม?`)) {
                performQuickSplit(parent, product);
            }
        } else { alert('สินค้าหมด! กรุณาเติมของที่หน้าสต็อก'); }
        return;
    }
    addToCart(product);
  };

  const performQuickSplit = async (parent: any, child: any) => {
     if (parent.stock <= 0) return alert(`ทำรายการไม่ได้! "${parent.name}" ก็หมดเหมือนกัน`);
     const updateParent = supabase.from('products').update({ stock: parent.stock - 1 }).eq('id', parent.id);
     const quantityGained = child.ratio; 
     const updateChild = supabase.from('products').update({ stock: child.stock + quantityGained }).eq('id', child.id);
     await Promise.all([updateParent, updateChild]);
     alert(`เบิกเรียบร้อย! ได้เพิ่มมา ${quantityGained} ${child.unit}`);
     fetchProducts();
  };

  const addToCart = (product: any) => {
    const currentInCart = cart.find(item => item.id === product.id)?.quantity || 0;
    if (currentInCart + 1 > product.stock) { alert('หยิบเกินจำนวนที่มีในสต็อก!'); return; }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) { return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item); }
      return [...prev, { ...product, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) { removeFromCart(productId); return; }
    const product = products.find(p => p.id === productId);
    if (product && newQty > product.stock) { alert('ของไม่พอ!'); return; }
    setCart((prev) => prev.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item)));
  };

  const removeFromCart = (productId: string) => { setCart((prev) => prev.filter((item) => item.id !== productId)); };

  // --- 4. Payment Logic ---
  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  const confirmPayment = async () => {
    setProcessingPayment(true);
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

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_id: selectedCustomer?.id || null,
                total_amount: totalAmount,
                payment_method: paymentMethod,
                cash_received: paymentMethod === 'cash' ? Number(cashReceived) : 0,
                change_amount: paymentMethod === 'cash' ? changeAmount : 0,
                slip_image: slipUrl
            })
            .select().single();

        if (orderError) throw new Error(orderError.message);
        const orderId = orderData.id;

        const orderItemsData = cart.map(item => ({
            order_id: orderId,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost || 0
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
        if (itemsError) throw new Error(itemsError.message);

        // ตัดสต็อก
        for (const item of cart) {
            const currentProduct = products.find(p => p.id === item.id);
            if (currentProduct) {
                const newStock = currentProduct.stock - item.quantity;
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
            }
        }

        alert(`✅ บันทึกเรียบร้อย!`);
        setCart([]);
        setIsPaymentModalOpen(false);
        setCashReceived('');
        setSlipFile(null);
        setSlipPreview(null);
        setSelectedCustomer(null);
        fetchProducts(); 

    } catch (error: any) {
        alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        setProcessingPayment(false);
    }
  };

  // ปริ้นใบเสร็จ (CSS ซ่อนใน globals.css)
  const handlePrint = () => {
    window.print();
  };

  // --- Helpers ---
  const startEditingNote = (item: any) => { setEditingNoteId(item.id); setTempNote(item.note || ''); };
  const saveNote = (productId: string) => { setCart((prev) => prev.map((item) => (item.id === productId ? { ...item, note: tempNote } : item))); setEditingNoteId(null); };
  
  const holdBill = () => { 
      if (cart.length === 0) return; 
      setHeldBills([...heldBills, { 
          id: Date.now(), 
          items: cart, 
          customer: selectedCustomer, 
          total: totalAmount, 
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) 
      }]); 
      setCart([]); 
      setSelectedCustomer(null);
  };
  
  const restoreBill = (index: number) => { 
      const billToRestore = heldBills[index]; 
      if (cart.length > 0 && !confirm('เคลียร์หน้าจอเพื่อเรียกบิลเก่า?')) return; 
      setCart(billToRestore.items); 
      setSelectedCustomer(billToRestore.customer); 
      setHeldBills(heldBills.filter((_, i) => i !== index)); 
      setIsHeldBillsModalOpen(false); 
  };
  
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (p.formula && p.formula.includes(searchTerm)) ||
                       (p.barcode && p.barcode === searchTerm); // รองรับบาร์โค้ดตอนพิมพ์ค้นหา
    const matchCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* --- ส่วนใบเสร็จสำหรับปริ้น (ซ่อนในหน้าจอปกติ) --- */}
      <div id="printable-receipt" className="hidden print:block p-2">
          <div className="text-center font-bold text-xl mb-2">ร้านปุ๋ยการเกษตร</div>
          <hr className="border-black mb-2"/>
          <div className="text-sm">
             {cart.map((item, i) => (
                <div key={i} className="flex justify-between mb-1">
                   <span>{item.name} x{item.quantity}</span>
                   <span>{(item.price * item.quantity).toLocaleString()}</span>
                </div>
             ))}
          </div>
          <hr className="border-black my-2"/>
          <div className="flex justify-between font-bold text-lg">
             <span>รวมสุทธิ</span>
             <span>{totalAmount.toLocaleString()}</span>
          </div>
          <div className="text-center text-xs mt-4">ขอบคุณที่อุดหนุนครับ</div>
      </div>

      {/* --- Section 1: Cart (ตะกร้า) --- */}
      <div className="w-full lg:w-2/5 h-[40vh] lg:h-full bg-white flex flex-col border-r shadow-xl z-10 order-1 lg:order-none">
        {/* Header ตะกร้า */}
        <div className="p-3 lg:p-4 bg-blue-900 text-white shadow-md flex justify-between items-center">
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6 lg:w-8 lg:h-8" /> รายการขาย</h1>
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
            <button onClick={() => setIsCustomerModalOpen(true)} className="bg-white border-2 border-orange-200 text-orange-600 px-3 py-1 lg:px-4 lg:py-2 rounded-lg font-bold text-xs lg:text-sm hover:bg-orange-100 transition">เปลี่ยน</button>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 lg:mt-20 text-lg lg:text-xl flex flex-col items-center gap-4"><ShoppingCart size={48} className="opacity-20" /><span>ยิงบาร์โค้ด หรือเลือกสินค้า</span></div>
          ) : (
            cart.map((item, index) => (
              <div key={item.id} className="bg-blue-50 p-2 lg:p-3 rounded-lg border border-blue-100 relative">
                <div className="flex items-start justify-between mb-1 lg:mb-2">
                   <div className="flex-1">
                      <div className="flex items-center gap-2"><span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{index + 1}</span><h3 className="text-base lg:text-lg font-bold text-gray-800 leading-tight">{item.name}</h3></div>
                      <div className="text-gray-500 text-xs lg:text-sm pl-6 mt-1">สูตร: {item.formula || '-'} | {item.unit}</div>
                   </div>
                   <div className="text-right pl-2"><div className="text-lg lg:text-xl font-bold text-blue-900">{(item.price * item.quantity).toLocaleString()}</div><div className="text-xs text-gray-400">@{item.price.toLocaleString()}</div></div>
                </div>
                <div className="flex items-center justify-between pl-6">
                   <div className="flex items-center gap-1 lg:gap-2 bg-white px-1 py-1 rounded-md border shadow-sm">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 font-bold text-lg lg:text-xl">-</button>
                      <span className="text-lg lg:text-xl font-bold w-6 lg:w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 font-bold text-lg lg:text-xl">+</button>
                   </div>
                   <div className="flex-1 px-2 lg:px-4">{editingNoteId === item.id ? (<div className="flex gap-2"><input type="text" autoFocus value={tempNote} onChange={(e) => setTempNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNote(item.id)} className="w-full text-xs lg:text-sm border-b-2 border-blue-500 outline-none bg-transparent" placeholder="..." /><button onClick={() => saveNote(item.id)} className="text-green-600"><Save size={16}/></button></div>) : (<div onClick={() => startEditingNote(item)} className="text-xs lg:text-sm text-gray-400 cursor-pointer hover:text-blue-600 flex items-center gap-1"><Pencil size={12} /> {item.note ? <span className="text-blue-600 font-medium">{item.note}</span> : "Note"}</div>)}</div>
                   <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 lg:p-4 bg-gray-50 border-t-2 border-gray-200">
          <div className="flex justify-between items-end mb-2 lg:mb-4"><span className="text-gray-600 text-lg lg:text-xl">ยอดรวม</span><span className="text-3xl lg:text-5xl font-bold text-blue-700">{totalAmount.toLocaleString()}</span></div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-2 lg:mb-3">
             <button onClick={holdBill} disabled={cart.length === 0} className="flex items-center justify-center gap-1 lg:gap-2 bg-yellow-100 text-yellow-800 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-yellow-200 transition border border-yellow-200 disabled:opacity-50"><PauseCircle size={18} /> <span className="hidden sm:inline">พักบิล</span></button>
             <button onClick={() => setIsHeldBillsModalOpen(true)} disabled={heldBills.length === 0} className="flex items-center justify-center gap-1 lg:gap-2 bg-purple-100 text-purple-800 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-purple-200 transition border border-purple-200 disabled:opacity-50 relative"><History size={18} /> <span className="hidden sm:inline">เรียกบิล</span> {heldBills.length > 0 && <span className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-red-500 text-white text-xs w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full border-2 border-white">{heldBills.length}</span>}</button>
             <button onClick={() => setCart([])} disabled={cart.length === 0} className="flex items-center justify-center gap-1 lg:gap-2 bg-gray-200 text-gray-700 py-2 lg:py-3 rounded-xl text-base lg:text-lg font-bold hover:bg-gray-300 transition disabled:opacity-50"><RotateCcw size={18} /> <span className="hidden sm:inline">ล้าง</span></button>
          </div>
          <button onClick={() => setIsPaymentModalOpen(true)} disabled={cart.length === 0} className={`w-full flex items-center justify-center gap-2 py-3 lg:py-5 rounded-xl text-2xl lg:text-3xl font-bold text-white transition shadow-lg ${cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95'}`}><Banknote size={28} className="lg:w-9 lg:h-9" /> รับเงิน</button>
        </div>
      </div>

      {/* --- Section 2: Shelf (ชั้นวาง) --- */}
      <div className="w-full lg:w-3/5 h-[60vh] lg:h-full p-3 lg:p-6 flex flex-col bg-gray-100 order-2 lg:order-none">
        
        {/* Header ค้นหา (แบบคลีน ลบปุ่มอื่นๆ ออกหมดแล้ว) */}
        <div className="mb-3 lg:mb-6 flex gap-2 lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="ยิงบาร์โค้ด หรือ ค้นหาชื่อ/สูตร..." 
                className="w-full pl-10 pr-4 py-2 lg:py-4 text-lg lg:text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown} // รองรับการยิงบาร์โค้ด
                autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2 mb-2 lg:mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {['ทั้งหมด', 'ปุ๋ยเม็ด', 'ปุ๋ยน้ำ', 'ยาเคมี', 'ฮอร์โมน', 'อุปกรณ์'].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 lg:px-6 lg:py-3 rounded-xl text-base lg:text-xl font-bold whitespace-nowrap transition shadow-sm ${selectedCategory === cat ? 'bg-blue-600 text-white transform scale-105' : 'bg-white text-gray-500 border hover:bg-gray-50'}`}>{cat}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 pb-20">
          {loading ? ( <div className="flex items-center justify-center h-40 text-blue-600 text-xl font-bold gap-3"><Loader2 className="animate-spin" size={32}/> กำลังโหลดสินค้า...</div> ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} onClick={() => handleProductClick(product)} className={`bg-white rounded-xl lg:rounded-2xl shadow-md border-2 transition cursor-pointer active:scale-95 flex flex-col overflow-hidden h-56 lg:h-72 group ${product.stock <= 0 ? 'border-red-300 opacity-80' : 'border-transparent hover:border-blue-500 hover:shadow-xl'}`}>
                  <div className="h-24 lg:h-32 w-full bg-white flex items-center justify-center relative overflow-hidden p-2">
                     {product.image_url ? <img src={product.image_url} className="object-contain h-full w-full group-hover:scale-110 transition duration-300" /> : <div className="text-gray-300"><ShoppingCart size={32}/></div>}
                     <div className="absolute top-1 right-1 lg:top-2 lg:right-2 bg-gray-100 text-gray-600 px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-md">{product.unit}</div>
                     {product.stock <= 0 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-black text-xl lg:text-3xl rotate-[-15deg] border-2 lg:border-4 border-white px-2 lg:px-4 py-1 rounded">หมด!</span></div>}
                  </div>
                  <div className="p-2 lg:p-4 flex flex-col flex-1 justify-between bg-white relative">
                    <div><div className="text-2xl lg:text-4xl font-black text-blue-900 mb-0 lg:mb-1 tracking-tighter">{product.formula || ''}</div><div className="text-gray-700 text-sm lg:text-lg leading-tight line-clamp-2 font-medium">{product.name}</div></div>
                    <div className="flex justify-between items-end mt-1 lg:mt-2"><div className="text-red-500 font-bold text-lg lg:text-2xl">{product.price.toLocaleString()}</div><div className={`text-[10px] lg:text-xs font-bold px-2 py-1 rounded ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>เหลือ: {product.stock}</div></div>
                    {product.type === 'sub' && <div className="absolute top-0 right-0 p-1 lg:p-2"><ArrowRightLeft size={14} className="text-orange-400" /></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      {isCustomerModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="bg-orange-100 p-4 flex justify-between items-center border-b border-orange-200"><h2 className="text-xl font-bold text-orange-800 flex items-center gap-2"><User /> เลือกลูกค้า</h2><button onClick={() => setIsCustomerModalOpen(false)} className="text-orange-800 hover:bg-orange-200 rounded-full p-1"><X /></button></div>
                  <div className="p-4 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input type="text" placeholder="ค้นหาชื่อเล่น หรือ ชื่อจริง..." className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-400" autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} /></div></div>
                  <div className="flex-1 overflow-y-auto p-2">
                      <div onClick={() => handleSelectCustomer(null)} className={`p-3 rounded-xl cursor-pointer flex items-center justify-between mb-2 border-2 ${!selectedCustomer ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:bg-gray-100'}`}><div className="font-bold">ลูกค้าทั่วไป (ไม่ระบุ)</div>{!selectedCustomer && <Check className="text-orange-500"/>}</div>
                      {filteredCustomers.map(cust => (
                          <div key={cust.id} onClick={() => handleSelectCustomer(cust)} className={`p-3 rounded-xl cursor-pointer flex items-center justify-between mb-2 border-2 ${selectedCustomer?.id === cust.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:bg-gray-100'}`}><div><div className="font-bold text-lg">{cust.nickname || cust.name}</div>{cust.nickname && <div className="text-sm text-gray-500">{cust.name}</div>}</div>{selectedCustomer?.id === cust.id && <Check className="text-orange-500"/>}</div>
                      ))}
                  </div>
                  <div className="bg-gray-50 p-4 border-t"><div className="text-xs font-bold text-gray-500 mb-2 uppercase">เพิ่มลูกค้าใหม่ด่วน</div><div className="flex gap-2"><input type="text" placeholder="ชื่อเล่น *" className="flex-1 border p-2 rounded-lg outline-none" value={newCustomerNick} onChange={e => setNewCustomerNick(e.target.value)} /><input type="text" placeholder="ชื่อจริง" className="flex-1 border p-2 rounded-lg outline-none" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} /><button onClick={handleAddCustomer} disabled={!newCustomerNick && !newCustomerName} className="bg-green-600 text-white p-2 rounded-lg disabled:bg-gray-300"><UserPlus /></button></div></div>
              </div>
          </div>
      )}

      {isHeldBillsModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
               <div className="bg-purple-100 p-4 border-b border-purple-200 flex justify-between items-center"><h2 className="text-xl lg:text-2xl font-bold text-purple-900 flex items-center gap-2"><History /> รายการที่พักไว้</h2><button onClick={() => setIsHeldBillsModalOpen(false)} className="text-gray-500 text-3xl">&times;</button></div>
               <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  {heldBills.length === 0 ? <div className="text-center text-gray-400 py-8">ไม่มีบิลที่พักไว้</div> : heldBills.map((bill, index) => (
                        <div key={bill.id} className="bg-white border-2 border-purple-100 p-4 rounded-xl flex justify-between items-center hover:border-purple-500 cursor-pointer shadow-sm" onClick={() => restoreBill(index)}><div><div className="text-gray-500 text-sm">เวลา: {bill.time} น.</div><div className="font-bold text-orange-600 text-sm">{bill.customer ? (bill.customer.nickname || bill.customer.name) : 'ทั่วไป'}</div><div className="text-lg font-bold text-gray-800">{bill.items.length} รายการ</div></div><div className="text-xl lg:text-2xl font-bold text-purple-700">{bill.total.toLocaleString()}.-</div></div>
                  ))}
               </div>
            </div>
         </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0"><h2 className="text-xl lg:text-2xl font-bold text-gray-800">ยืนยันการชำระเงิน</h2><button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-500 hover:text-red-500 text-4xl leading-none">&times;</button></div>
            <div className="p-6 lg:p-8 overflow-y-auto">
              <div className="text-center mb-4"><span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-bold">ลูกค้า: {selectedCustomer ? (selectedCustomer.nickname || selectedCustomer.name) : 'ทั่วไป'}</span></div>
              <div className="text-center mb-6"><div className="text-gray-500 text-lg lg:text-xl">ยอดที่ต้องชำระ</div><div className="text-5xl lg:text-7xl font-black text-blue-800">{totalAmount.toLocaleString()}.-</div></div>
              <div className="flex gap-4 mb-6">
                <button onClick={() => { setPaymentMethod('cash'); setCashReceived(''); }} className={`flex-1 py-4 lg:py-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><Banknote size={32} className="lg:w-10 lg:h-10" /> <span className="text-xl lg:text-2xl font-bold">เงินสด</span></button>
                <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-4 lg:py-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><CreditCard size={32} className="lg:w-10 lg:h-10" /> <span className="text-xl lg:text-2xl font-bold">เงินโอน</span></button>
              </div>
              
              {paymentMethod === 'cash' ? (
                <div className="space-y-4 lg:space-y-6">
                  <div className="flex items-center gap-4"><label className="text-xl lg:text-2xl font-bold w-1/3 text-gray-700">รับเงินมา:</label><input type="number" autoFocus className="flex-1 text-right text-3xl lg:text-4xl p-3 lg:p-4 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none text-gray-800 placeholder-gray-300" placeholder="0.00" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} /></div>
                  <div className={`flex items-center gap-4 p-4 lg:p-6 rounded-xl border-2 ${changeAmount < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}><label className="text-xl lg:text-2xl font-bold w-1/3 text-gray-700">เงินทอน:</label><div className={`flex-1 text-right text-4xl lg:text-5xl font-black ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>{cashReceived ? changeAmount.toLocaleString() : '0'}</div></div>
                </div>
              ) : (
                <div className="space-y-4">
                    <div className="text-center bg-gray-50 p-4 lg:p-6 rounded-xl border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 mb-2">สแกน QR Code เพื่อชำระเงิน</p>
                        <div className="w-40 h-40 lg:w-48 lg:h-48 mx-auto mb-4 flex items-center justify-center rounded-lg overflow-hidden border"><img src="/qrcode.jpg" className="w-full h-full object-cover" /></div>
                        <p className="text-lg lg:text-xl font-bold text-gray-800">ร้านปุ๋ยการเกษตร</p>
                        <p className="text-blue-600 font-bold text-base lg:text-lg">ธ.กสิกรไทย 123-4-56789-0</p>
                    </div>
                    <div className="border-t pt-4">
                        <label className="block text-gray-700 font-bold mb-2 text-lg">หลักฐานการโอน (สลิป)</label>
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1"><input type="file" accept="image/*" capture="environment" onChange={handleSlipChange} className="hidden" id="slip-upload" /><label htmlFor="slip-upload" className="flex items-center justify-center gap-2 w-full p-3 lg:p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 text-blue-600 font-bold cursor-pointer hover:bg-blue-100 transition"><Upload /> {slipFile ? 'เปลี่ยนรูปสลิป' : 'ถ่ายรูป / อัปโหลดสลิป'}</label></div>
                            {slipPreview && (<div className="relative w-20 h-20 lg:w-24 lg:h-24 border rounded-lg overflow-hidden"><img src={slipPreview} className="w-full h-full object-cover" /><button onClick={() => {setSlipFile(null); setSlipPreview(null);}} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg"><X size={12}/></button></div>)}
                        </div>
                    </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 lg:gap-4 shrink-0">
              <button onClick={handlePrint} className="px-6 py-3 lg:px-8 lg:py-4 rounded-xl text-lg lg:text-xl font-bold text-gray-600 hover:bg-gray-200 transition flex items-center gap-2"><Printer/> พิมพ์</button>
              <button onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-3 lg:px-8 lg:py-4 rounded-xl text-lg lg:text-xl font-bold text-gray-600 hover:bg-gray-200 transition">แก้ไข</button>
              <button onClick={confirmPayment} disabled={(paymentMethod === 'cash' && changeAmount < 0) || processingPayment} className="px-6 py-3 lg:px-10 lg:py-4 rounded-xl text-lg lg:text-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center gap-2">{processingPayment ? <Loader2 className="animate-spin"/> : 'ยืนยัน'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}