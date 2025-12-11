'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Package, ArrowRightLeft, Edit, AlertTriangle, X, ArrowLeft, Trash2, Save, Upload, Image as ImageIcon } from 'lucide-react';

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formValue, setFormValue] = useState<any>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching products:', error); else setProducts(data || []);
    setLoading(false);
  };

  const openAddModal = () => { setSelectedProduct(null); setFormValue({ name: '', formula: '', price: 0, cost: 0, stock: 0, unit: 'ชิ้น', category: 'ปุ๋ยเม็ด', type: 'main', ratio: 1 }); setSelectedFile(null); setPreviewUrl(null); setIsProductModalOpen(true); };
  const openEditModal = (product: any) => { setSelectedProduct(product); setFormValue({ ...product }); setSelectedFile(null); setPreviewUrl(product.image_url); setIsProductModalOpen(true); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) { setSelectedFile(null); return; } const file = e.target.files[0]; setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); };

  const saveProduct = async () => {
    if (!formValue.name) return alert('กรุณาใส่ชื่อสินค้า');
    setUploading(true);
    let finalImageUrl = formValue.image_url;
    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, selectedFile);
        if (uploadError) { alert('อัปโหลดรูปไม่ผ่าน: ' + uploadError.message); setUploading(false); return; }
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
    }
    const productData = { ...formValue, image_url: finalImageUrl };
    if (selectedProduct) { const { error } = await supabase.from('products').update(productData).eq('id', selectedProduct.id); if (error) return alert('บันทึกไม่สำเร็จ: ' + error.message); } 
    else { const { id, ...newProduct } = productData; const { error } = await supabase.from('products').insert(newProduct); if (error) return alert('สร้างสินค้าไม่สำเร็จ: ' + error.message); }
    setUploading(false); setIsProductModalOpen(false); fetchProducts(); alert('บันทึกเรียบร้อย!');
  };

  const handleDelete = async (id: string) => { if (confirm('ยืนยันที่จะลบสินค้านี้?')) { const { error } = await supabase.from('products').delete().eq('id', id); if (error) alert('ลบไม่ได้: ' + error.message); else fetchProducts(); } };
  const handleStockIn = (product: any) => { setSelectedProduct(product); setFormValue({ quantity: '', note: '' }); setIsStockInModalOpen(true); };
  const saveStockIn = async () => { const qty = Number(formValue.quantity); if (qty <= 0) return; const newStock = (selectedProduct.stock || 0) + qty; const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', selectedProduct.id); if (error) alert('Error: ' + error.message); else { alert(`เติมสต็อกเรียบร้อย!`); setIsStockInModalOpen(false); fetchProducts(); } };
  const handleSplit = (childProduct: any) => { const parent = products.find(p => p.id === childProduct.parent_id); if (!parent) return alert('ไม่พบสินค้าหลัก'); setSelectedProduct(childProduct); setFormValue({ parentName: parent.name, parentStock: parent.stock, parentId: parent.id, ratio: childProduct.ratio, splitAmount: 1 }); setIsSplitModalOpen(true); };
  const saveSplit = async () => { const splitQty = Number(formValue.splitAmount); const quantityGained = splitQty * formValue.ratio; if (splitQty > formValue.parentStock) return alert('สต็อกสินค้าหลักไม่พอ!'); const updateParent = supabase.from('products').update({ stock: formValue.parentStock - splitQty }).eq('id', formValue.parentId); const updateChild = supabase.from('products').update({ stock: selectedProduct.stock + quantityGained }).eq('id', selectedProduct.id); await Promise.all([updateParent, updateChild]); alert('แตกหน่วยสำเร็จ!'); setIsSplitModalOpen(false); fetchProducts(); };

  const totalCost = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalProfit = totalValue - totalCost;
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const filteredProducts = products.filter(p => p.name.includes(searchTerm) || (p.formula && p.formula.includes(searchTerm)));

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 bg-white p-4 rounded-2xl shadow-sm gap-4">
         <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 lg:px-6 lg:py-3 rounded-xl hover:bg-red-200 transition active:scale-95 border-2 border-red-200">
               <ArrowLeft size={24} className="lg:w-8 lg:h-8" strokeWidth={3} /> <span className="text-lg lg:text-2xl font-bold">หน้าร้าน</span>
            </Link>
            <div className="h-10 w-px bg-gray-300 mx-2 hidden lg:block"></div>
            <h1 className="text-xl lg:text-3xl font-black text-gray-800 flex items-center gap-2">
               <Package size={24} className="lg:w-9 lg:h-9 text-blue-600" /> จัดการสต็อก
            </h1>
         </div>
         {loading && <div className="text-blue-600 font-bold animate-pulse text-sm">กำลังโหลด...</div>}
      </div>

      {/* Dashboard Responsive Grid */}
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
            <input type="text" placeholder="ค้นหาสินค้า..." className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-lg shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
         </div>
         <button onClick={openAddModal} className="w-full lg:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md text-lg"><Plus size={24} /> เพิ่มสินค้าใหม่</button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
         {/* Table Responsive Scroll */}
         <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 text-gray-600 text-left border-b text-lg">
                <tr>
                    <th className="p-4 w-24">รูป</th>
                    <th className="p-4">สินค้า / สูตร</th>
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
                        <td className="p-4"><div className="font-black text-gray-800 text-xl">{product.formula || '-'}</div><div className="text-gray-600 text-base">{product.name}</div></td>
                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-sm font-bold ${product.category === 'ปุ๋ยเม็ด' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{product.category}</span></td>
                        <td className="p-4 text-right text-gray-500">{(product.cost || 0).toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-blue-700 text-xl">{(product.price || 0).toLocaleString()}</td>
                        <td className="p-4 text-center"><div className={`text-2xl font-black ${(product.stock || 0) <= 5 ? 'text-red-500' : 'text-green-600'}`}>{product.stock}</div><div className="text-sm text-gray-400">{product.unit}</div></td>
                        <td className="p-4">
                            <div className="flex justify-center gap-2">
                            <button onClick={() => handleStockIn(product)} className="p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Plus size={24} /></button>
                            <button onClick={() => openEditModal(product)} className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><Edit size={24} /></button>
                            {product.type === 'sub' && (<button onClick={() => handleSplit(product)} className="p-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"><ArrowRightLeft size={24} /></button>)}
                            <button onClick={() => handleDelete(product.id)} className="p-3 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 hover:text-red-600"><Trash2 size={24} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
         </div>
      </div>

      {/* --- Modals (Responsive max-width) --- */}
      {isProductModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
               <div className="bg-blue-600 p-4 font-bold text-lg text-white flex justify-between items-center">{selectedProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}<button onClick={() => setIsProductModalOpen(false)} className="p-1 bg-white/20 rounded-full hover:bg-white/40"><X size={24} /></button></div>
               <div className="p-6 space-y-4">
                  <div className="flex flex-col items-center justify-center mb-4"><div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500">{previewUrl ? (<img src={previewUrl} className="w-full h-full object-cover" />) : (<div className="text-center text-gray-400"><Upload className="mx-auto mb-1"/><span>รูปสินค้า</span></div>)}<input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" /></div><div className="text-sm text-gray-500 mt-2">คลิกที่กรอบเพื่อเปลี่ยนรูป</div></div>
                  <div><label className="block text-gray-700 mb-1">ชื่อสินค้า *</label><input type="text" value={formValue.name} onChange={e => setFormValue({...formValue, name: e.target.value})} className="w-full border p-3 rounded text-lg" placeholder="เช่น ปุ๋ยตรากระต่าย" /></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-gray-700 mb-1">สูตร (ถ้ามี)</label><input type="text" value={formValue.formula} onChange={e => setFormValue({...formValue, formula: e.target.value})} className="w-full border p-3 rounded text-lg" placeholder="เช่น 46-0-0" /></div><div><label className="block text-gray-700 mb-1">หมวดหมู่</label><select value={formValue.category} onChange={e => setFormValue({...formValue, category: e.target.value})} className="w-full border p-3 rounded text-lg bg-white"><option>ปุ๋ยเม็ด</option><option>ปุ๋ยน้ำ</option><option>ยาเคมี</option><option>ฮอร์โมน</option><option>อุปกรณ์</option></select></div></div>
                  <div className="grid grid-cols-3 gap-4"><div><label className="block text-gray-700 mb-1">หน่วยนับ</label><input type="text" value={formValue.unit} onChange={e => setFormValue({...formValue, unit: e.target.value})} className="w-full border p-3 rounded text-lg" placeholder="กระสอบ" /></div><div><label className="block text-gray-700 mb-1">ราคาทุน</label><input type="number" value={formValue.cost} onChange={e => setFormValue({...formValue, cost: Number(e.target.value)})} className="w-full border p-3 rounded text-lg" /></div><div><label className="block text-gray-700 mb-1">ราคาขาย</label><input type="number" value={formValue.price} onChange={e => setFormValue({...formValue, price: Number(e.target.value)})} className="w-full border p-3 rounded text-lg" /></div></div>
                  <div className="p-4 bg-gray-50 rounded border"><label className="flex items-center gap-2 text-gray-700 font-bold mb-2"><input type="checkbox" checked={formValue.type === 'sub'} onChange={e => setFormValue({...formValue, type: e.target.checked ? 'sub' : 'main'})} className="w-5 h-5" />สินค้านี้แบ่งขายมาจากตัวอื่น?</label>{formValue.type === 'sub' && (<div className="pl-6 space-y-2"><input type="text" placeholder="Parent ID (UUID)" value={formValue.parent_id || ''} onChange={e => setFormValue({...formValue, parent_id: e.target.value})} className="w-full border p-2 rounded" /><div className="flex items-center gap-2"><span>อัตราส่วน 1 แม่ :</span><input type="number" value={formValue.ratio} onChange={e => setFormValue({...formValue, ratio: Number(e.target.value)})} className="w-20 border p-2 rounded text-center" /><span>ลูก</span></div></div>)}</div>
               </div>
               <div className="p-4 bg-gray-50 flex justify-end gap-2"><button onClick={saveProduct} disabled={uploading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400">{uploading ? 'กำลังอัปโหลด...' : <><Save /> บันทึก</>}</button></div>
            </div>
         </div>
      )}

      {isStockInModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">
               <div className="bg-green-100 p-4 font-bold text-lg text-green-800 flex justify-between items-center"><div className="flex gap-2 items-center"><Package /> รับสินค้าเข้า</div><button onClick={() => setIsStockInModalOpen(false)} className="p-2 bg-white/50 rounded-full"><X size={24} /></button></div>
               <div className="p-6"><div className="mb-4 text-center"><div className="text-gray-500">สินค้า</div><div className="text-xl font-bold">{selectedProduct?.name}</div><div className="text-sm text-gray-400">คงเหลือปัจจุบัน: {selectedProduct?.stock} {selectedProduct?.unit}</div></div><div className="mb-4"><label className="block text-gray-700 mb-2 font-bold">จำนวนที่รับเข้า (+)</label><input type="number" className="w-full text-center text-4xl font-bold border-2 border-green-200 rounded-xl p-4 focus:border-green-500 outline-none" autoFocus placeholder="0" value={formValue.quantity} onChange={e => setFormValue({...formValue, quantity: e.target.value})} /></div></div>
               <div className="p-4 bg-gray-50 flex justify-end gap-2"><button onClick={saveStockIn} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700">ยืนยันรับของ</button></div>
            </div>
         </div>
      )}

      {isSplitModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
               <div className="bg-orange-100 p-4 font-bold text-lg text-orange-800 flex justify-between items-center"><div className="flex gap-2 items-center"><ArrowRightLeft /> เบิกสินค้ามาแตกหน่วย</div><button onClick={() => setIsSplitModalOpen(false)} className="p-2 bg-white/50 rounded-full"><X size={24} /></button></div>
               <div className="p-6 space-y-4"><div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border"><div className="text-center"><div className="text-sm text-gray-500">เบิกจาก (แม่)</div><div className="font-bold">{formValue.parentName}</div><div className="text-xs text-gray-400">คงเหลือ: {formValue.parentStock}</div></div><ArrowRightLeft className="text-orange-500" /><div className="text-center"><div className="text-sm text-gray-500">เข้าสู่ (ลูก)</div><div className="font-bold">{selectedProduct?.name}</div><div className="text-xs text-gray-400">อัตราส่วน: 1 ต่อ {formValue.ratio}</div></div></div><div className="flex items-end gap-4"><div className="flex-1"><label className="block font-bold mb-1">จำนวนเบิก (แม่)</label><input type="number" className="w-full border p-3 rounded-xl text-2xl font-bold text-center" value={formValue.splitAmount} onChange={e => setFormValue({...formValue, splitAmount: e.target.value})} /></div><div className="pb-4 text-gray-400 text-xl">=</div><div className="flex-1 bg-gray-100 p-3 rounded-xl border text-center"><label className="block text-xs text-gray-500">จะได้สินค้าลูก (เพิ่ม)</label><div className="text-2xl font-bold text-green-600">{(formValue.splitAmount || 0) * formValue.ratio} {selectedProduct?.unit}</div></div></div><div className="text-sm text-red-500 bg-red-50 p-2 rounded">* ระบบจะตัดสต็อกแม่ และเพิ่มสต็อกลูกทันที</div></div>
               <div className="p-4 bg-gray-50 flex justify-end gap-2"><button onClick={saveSplit} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-orange-600">ยืนยันแตกหน่วย</button></div>
            </div>
         </div>
      )}

    </div>
  );
}