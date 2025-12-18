'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { Search, Plus, Package, Edit, AlertTriangle, X, ArrowLeft, Trash2, Save, Upload, Image as ImageIcon, Barcode, Tag } from 'lucide-react';

// Types
interface MasterData {
  id: string;
  name: string;
}

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<MasterData[]>([]);
  const [units, setUnits] = useState<MasterData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  
  // Form State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formValue, setFormValue] = useState<any>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { 
      fetchMasterData();
      fetchProducts(); 
  }, []);

  const fetchMasterData = async () => {
      const { data: cats } = await supabase.from('master_categories').select('*').order('name');
      const { data: uns } = await supabase.from('master_units').select('*').order('name');
      setCategories(cats || []);
      setUnits(uns || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    // ดึง SKU และ Barcode มาด้วย
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            master_categories (name),
            master_units (name),
            inventory (quantity),
            product_barcodes (barcode)
        `)
        .eq('is_active', true)
        .eq('inventory.branch_id', CURRENT_BRANCH_ID)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
    } else {
        const formatted = data?.map((p: any) => ({
            ...p,
            stock: p.inventory?.[0]?.quantity || 0,
            category: p.master_categories?.name || '-',
            unit: p.master_units?.name || '-',
            barcode: p.product_barcodes?.[0]?.barcode || ''
        })) || [];
        setProducts(formatted);
    }
    setLoading(false);
  };

  const openAddModal = () => { 
      setSelectedProduct(null); 
      setFormValue({ 
          sku: '', // รหัสสินค้า
          name: '', 
          description: '', 
          price: 0, 
          cost: 0, 
          stock: 0, 
          barcode: '',
          category_id: categories[0]?.id || '',
          unit_id: units[0]?.id || ''
      }); 
      setSelectedFile(null); 
      setPreviewUrl(null); 
      setIsProductModalOpen(true); 
  };

  const openEditModal = (product: any) => { 
      setSelectedProduct(product); 
      setFormValue({ 
          sku: product.sku || '', // ดึงรหัสสินค้ามาใส่ฟอร์ม
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          barcode: product.barcode,
          category_id: product.category_id,
          unit_id: product.unit_id,
          image_url: product.image_url
      }); 
      setSelectedFile(null); 
      setPreviewUrl(product.image_url); 
      setIsProductModalOpen(true); 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
      if (!e.target.files || e.target.files.length === 0) { setSelectedFile(null); return; } 
      const file = e.target.files[0]; 
      setSelectedFile(file); 
      setPreviewUrl(URL.createObjectURL(file)); 
  };

  const saveProduct = async () => {
    if (!formValue.name) return alert('กรุณาใส่ชื่อสินค้า');
    
    setUploading(true);
    try {
        let finalImageUrl = formValue.image_url;
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, selectedFile);
            if (uploadError) throw new Error('อัปโหลดรูปไม่ผ่าน: ' + uploadError.message);
            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            finalImageUrl = data.publicUrl;
        }

        // เตรียมข้อมูลบันทึก (เพิ่ม SKU)
        const productPayload = {
            sku: formValue.sku || null, // บันทึกรหัสสินค้า
            name: formValue.name,
            description: formValue.description,
            price: Number(formValue.price),
            cost: Number(formValue.cost),
            category_id: formValue.category_id,
            unit_id: formValue.unit_id,
            image_url: finalImageUrl
        };

        let productId = selectedProduct?.id;

        // Save to Products Table
        if (selectedProduct) {
            const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('products').insert(productPayload).select().single();
            if (error) throw error;
            productId = data.id;
        }

        // Save Inventory
        const { data: existingInv } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('product_id', productId)
            .single();

        const newQty = Number(formValue.stock);

        if (existingInv) {
            if (existingInv.quantity !== newQty) {
                await supabase.from('inventory').update({ quantity: newQty }).eq('id', existingInv.id);
                // Log Movement
                await supabase.from('inventory_movements').insert({
                    branch_id: CURRENT_BRANCH_ID,
                    product_id: productId,
                    type: 'ADJUST',
                    quantity: newQty - existingInv.quantity,
                    balance_after: newQty,
                    reason: 'แก้ไขหน้าจัดการสินค้า',
                    ref_type: 'MANUAL'
                });
            }
        } else {
            await supabase.from('inventory').insert({
                branch_id: CURRENT_BRANCH_ID,
                product_id: productId,
                quantity: newQty
            });
             if (newQty > 0) {
                await supabase.from('inventory_movements').insert({
                    branch_id: CURRENT_BRANCH_ID,
                    product_id: productId,
                    type: 'ADJUST',
                    quantity: newQty,
                    balance_after: newQty,
                    reason: 'สินค้าใหม่',
                    ref_type: 'MANUAL'
                });
             }
        }

        // Save Barcode
        if (formValue.barcode) {
             await supabase.from('product_barcodes').delete().eq('product_id', productId);
             await supabase.from('product_barcodes').insert({ product_id: productId, barcode: formValue.barcode });
        }

        alert('บันทึกเรียบร้อย!');
        setIsProductModalOpen(false);
        fetchProducts();

    } catch (error: any) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        setUploading(false);
    }
  };

  const handleDelete = async (id: string) => { 
      if (confirm('ยืนยันที่จะลบสินค้านี้?')) { 
          const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id); 
          if (error) alert('ลบไม่ได้: ' + error.message); 
          else fetchProducts(); 
      } 
  };

  const handleStockIn = (product: any) => { setSelectedProduct(product); setFormValue({ quantity: '', note: '' }); setIsStockInModalOpen(true); };
  
  const saveStockIn = async () => { 
      const qty = Number(formValue.quantity); 
      if (qty <= 0) return; 
      try {
        const newStock = (selectedProduct.stock || 0) + qty;
        await supabase.from('inventory').update({ quantity: newStock }).eq('branch_id', CURRENT_BRANCH_ID).eq('product_id', selectedProduct.id);
        await supabase.from('inventory_movements').insert({
            branch_id: CURRENT_BRANCH_ID,
            product_id: selectedProduct.id,
            type: 'RECEIVE',
            quantity: qty,
            balance_after: newStock,
            reason: 'เติมสต็อกด่วน',
            ref_type: 'MANUAL'
        });
        alert(`เติมสต็อกเรียบร้อย!`); setIsStockInModalOpen(false); fetchProducts(); 
      } catch (e: any) { alert('Error: ' + e.message); }
  };

  // Calculations
  const totalCost = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalProfit = totalValue - totalCost;
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  
  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) || // ค้นหาด้วย SKU
      (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 bg-white p-4 rounded-2xl shadow-sm gap-4">
         <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 lg:px-6 lg:py-3 rounded-xl hover:bg-red-200 transition active:scale-95 border-2 border-red-200">
               <ArrowLeft size={24} className="lg:w-8 lg:h-8" strokeWidth={3} /> <span className="text-lg lg:text-2xl font-bold">หน้าร้าน</span>
            </Link>
            <div className="h-10 w-px bg-gray-300 mx-2 hidden lg:block"></div>
            <h1 className="text-xl lg:text-3xl font-black text-gray-800 flex items-center gap-2">
               <Package size={24} className="lg:w-9 lg:h-9 text-blue-600" /> จัดการสต็อก (HQ)
            </h1>
         </div>
         {loading && <div className="text-blue-600 font-bold animate-pulse text-sm">กำลังโหลด...</div>}
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <div className="text-gray-500 text-sm">มูลค่าทุนรวม (บาท)</div><div className="text-2xl font-bold text-gray-800">{totalCost.toLocaleString()}</div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <div className="text-gray-500 text-sm">มูลค่าขายรวม (บาท)</div><div className="text-2xl font-bold text-gray-800">{totalValue.toLocaleString()}</div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
            <div className="text-gray-500 text-sm">กำไรคาดการณ์</div><div className="text-2xl font-bold text-purple-700">+{totalProfit.toLocaleString()}</div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <div className="text-gray-500 text-sm">สินค้าใกล้หมด</div><div className="text-2xl font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={24} /> {lowStockCount} รายการ</div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-3">
         <div className="relative w-full lg:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ค้นหาชื่อ, รหัส, หรือบาร์โค้ด..." className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-lg shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
         </div>
         <button onClick={openAddModal} className="w-full lg:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md text-lg"><Plus size={24} /> เพิ่มสินค้าใหม่</button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 text-gray-600 text-left border-b text-lg">
                <tr>
                    <th className="p-4 w-24">รูป</th>
                    <th className="p-4">รหัส / สินค้า</th>
                    <th className="p-4 text-center">ประเภท</th>
                    <th className="p-4 text-right">ทุน</th>
                    <th className="p-4 text-right">ขาย</th>
                    <th className="p-4 text-center">คงเหลือ</th>
                    <th className="p-4 text-center">จัดการ</th>
                </tr>
                </thead>
                <tbody className="text-lg">
                {products.length === 0 && !loading && (<tr><td colSpan={7} className="text-center p-8 text-gray-400">ยังไม่มีสินค้า</td></tr>)}
                {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-blue-50 transition">
                        <td className="p-4">
                            {product.image_url ? <img src={product.image_url} alt="" className="w-16 h-16 object-cover bg-gray-100 rounded-lg border" /> : <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"><ImageIcon size={24}/></div>}
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col gap-1">
                                {/* แสดง SKU ถ้ามี */}
                                {product.sku && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded w-fit font-bold">{product.sku}</span>}
                                <div className="font-bold text-gray-800 text-xl">{product.name}</div>
                                <div className="text-gray-500 text-sm">{product.description || '-'}</div>
                                {/* แสดง Barcode ถ้ามี */}
                                {product.barcode && <div className="text-xs text-gray-400 flex items-center gap-1"><Barcode size={12}/> {product.barcode}</div>}
                            </div>
                        </td>
                        <td className="p-4 text-center"><span className="px-2 py-1 rounded text-sm font-bold bg-gray-100 text-gray-600">{product.category}</span></td>
                        <td className="p-4 text-right text-gray-500">{(product.cost || 0).toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-blue-700 text-xl">{(product.price || 0).toLocaleString()}</td>
                        <td className="p-4 text-center"><div className={`text-2xl font-black ${(product.stock || 0) <= 5 ? 'text-red-500' : 'text-green-600'}`}>{product.stock}</div><div className="text-sm text-gray-400">{product.unit}</div></td>
                        <td className="p-4">
                            <div className="flex justify-center gap-2">
                            <button onClick={() => handleStockIn(product)} className="p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="เติมสต็อก"><Plus size={24} /></button>
                            <button onClick={() => openEditModal(product)} className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" title="แก้ไข"><Edit size={24} /></button>
                            <button onClick={() => handleDelete(product.id)} className="p-3 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 hover:text-red-600" title="ลบ"><Trash2 size={24} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
         </div>
      </div>

      {/* --- Product Modal (Add/Edit) --- */}
      {isProductModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
               <div className="bg-blue-600 p-4 font-bold text-lg text-white flex justify-between items-center">{selectedProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}<button onClick={() => setIsProductModalOpen(false)} className="p-1 bg-white/20 rounded-full hover:bg-white/40"><X size={24} /></button></div>
               <div className="p-6 space-y-4">
                  {/* Image Upload */}
                  <div className="flex flex-col items-center justify-center mb-4"><div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500">{previewUrl ? (<img src={previewUrl} className="w-full h-full object-cover" />) : (<div className="text-center text-gray-400"><Upload className="mx-auto mb-1"/><span>รูปสินค้า</span></div>)}<input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div>
                  
                  {/* รหัสสินค้า & บาร์โค้ด */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
                      <div>
                          <label className="block text-gray-700 mb-1 font-bold flex items-center gap-1"><Tag size={16}/> รหัสสินค้า (SKU)</label>
                          <input type="text" value={formValue.sku} onChange={e => setFormValue({...formValue, sku: e.target.value})} className="w-full border p-3 rounded-lg text-lg uppercase" placeholder="เช่น A-001" />
                          <div className="text-xs text-gray-400 mt-1">สำหรับสินค้าที่ไม่มีบาร์โค้ด</div>
                      </div>
                      <div>
                          <label className="block text-gray-700 mb-1 font-bold flex items-center gap-1"><Barcode size={16}/> บาร์โค้ด</label>
                          <input type="text" value={formValue.barcode} onChange={e => setFormValue({...formValue, barcode: e.target.value})} className="w-full border p-3 rounded-lg text-lg font-mono" placeholder="ยิงสแกนเนอร์ที่นี่" />
                          <div className="text-xs text-gray-400 mt-1">ถ้ามีบาร์โค้ดสากล</div>
                      </div>
                  </div>

                  {/* Name & Formula */}
                  <div><label className="block text-gray-700 mb-1">ชื่อสินค้า *</label><input type="text" value={formValue.name} onChange={e => setFormValue({...formValue, name: e.target.value})} className="w-full border p-3 rounded text-lg" placeholder="เช่น ปุ๋ยตรากระต่าย" /></div>
                  <div><label className="block text-gray-700 mb-1">รายละเอียด / สูตร</label><input type="text" value={formValue.description} onChange={e => setFormValue({...formValue, description: e.target.value})} className="w-full border p-3 rounded text-lg" placeholder="เช่น สูตร 46-0-0" /></div>
                  
                  {/* Dropdowns */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-gray-700 mb-1">หมวดหมู่ *</label>
                          <select value={formValue.category_id} onChange={e => setFormValue({...formValue, category_id: e.target.value})} className="w-full border p-3 rounded text-lg bg-white">
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-gray-700 mb-1">หน่วยนับ *</label>
                          <select value={formValue.unit_id} onChange={e => setFormValue({...formValue, unit_id: e.target.value})} className="w-full border p-3 rounded text-lg bg-white">
                              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                      </div>
                  </div>

                  {/* Price & Cost */}
                  <div className="grid grid-cols-3 gap-4 border-t pt-4">
                      <div><label className="block text-gray-700 mb-1">ราคาทุน</label><input type="number" value={formValue.cost} onChange={e => setFormValue({...formValue, cost: Number(e.target.value)})} className="w-full border p-3 rounded text-lg" /></div>
                      <div><label className="block text-gray-700 mb-1">ราคาขาย</label><input type="number" value={formValue.price} onChange={e => setFormValue({...formValue, price: Number(e.target.value)})} className="w-full border p-3 rounded text-lg" /></div>
                      <div><label className="block text-gray-700 mb-1 font-bold text-blue-600">สต็อก</label><input type="number" value={formValue.stock} onChange={e => setFormValue({...formValue, stock: Number(e.target.value)})} className="w-full border p-3 rounded text-lg bg-blue-50 font-bold" /></div>
                  </div>
               </div>
               <div className="p-4 bg-gray-50 flex justify-end gap-2"><button onClick={saveProduct} disabled={uploading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400">{uploading ? 'กำลังอัปโหลด...' : <><Save /> บันทึก</>}</button></div>
            </div>
         </div>
      )}

      {/* --- Stock In Modal --- */}
      {isStockInModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">
               <div className="bg-green-100 p-4 font-bold text-lg text-green-800 flex justify-between items-center"><div className="flex gap-2 items-center"><Package /> รับสินค้าเข้า</div><button onClick={() => setIsStockInModalOpen(false)} className="p-2 bg-white/50 rounded-full"><X size={24} /></button></div>
               <div className="p-6"><div className="mb-4 text-center"><div className="text-gray-500">สินค้า</div><div className="text-xl font-bold">{selectedProduct?.name}</div><div className="text-sm text-gray-400">คงเหลือปัจจุบัน: {selectedProduct?.stock} {selectedProduct?.unit}</div></div><div className="mb-4"><label className="block text-gray-700 mb-2 font-bold">จำนวนที่รับเข้า (+)</label><input type="number" className="w-full text-center text-4xl font-bold border-2 border-green-200 rounded-xl p-4 focus:border-green-500 outline-none" autoFocus placeholder="0" value={formValue.quantity} onChange={e => setFormValue({...formValue, quantity: e.target.value})} /></div></div>
               <div className="p-4 bg-gray-50 flex justify-end gap-2"><button onClick={saveStockIn} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700">ยืนยันรับของ</button></div>
            </div>
         </div>
      )}

    </div>
  );
}