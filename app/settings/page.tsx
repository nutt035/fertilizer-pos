'use client';

import React, { useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { Settings, Save, MapPin, FileText, Layers, Tag, Trash2, Plus, Store } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'BRANCH' | 'CATEGORY' | 'UNIT'>('BRANCH');
  const [loading, setLoading] = useState(false);

  // --- Branch State ---
  const [branch, setBranch] = useState({
    name: '', address: '', phone: '', tax_id: '', receipt_header: '', receipt_footer: ''
  });

  // --- Master Data State ---
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    fetchBranchInfo();
    fetchMasterData();
  }, []);

  const fetchBranchInfo = async () => {
    const { data } = await supabase.from('branches').select('*').eq('id', CURRENT_BRANCH_ID).single();
    if (data) {
        setBranch({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            tax_id: data.tax_id || '',
            receipt_header: data.receipt_header || '',
            receipt_footer: data.receipt_footer || ''
        });
    }
  };

  const fetchMasterData = async () => {
      const { data: cats } = await supabase.from('master_categories').select('*').order('name');
      const { data: uns } = await supabase.from('master_units').select('*').order('name');
      setCategories(cats || []);
      setUnits(uns || []);
  };

  const handleSaveBranch = async () => {
    setLoading(true);
    const { error } = await supabase.from('branches').update(branch).eq('id', CURRENT_BRANCH_ID);
    if (error) alert('Error: ' + error.message);
    else alert('✅ บันทึกข้อมูลร้านเรียบร้อย');
    setLoading(false);
  };

  const handleAddItem = async (type: 'CATEGORY' | 'UNIT') => {
      if (!newItemName.trim()) return;
      const table = type === 'CATEGORY' ? 'master_categories' : 'master_units';
      
      const { error } = await supabase.from(table).insert({ name: newItemName });
      if (error) {
          alert('เพิ่มไม่สำเร็จ (ชื่ออาจซ้ำ): ' + error.message);
      } else {
          setNewItemName('');
          fetchMasterData();
      }
  };

  const handleDeleteItem = async (type: 'CATEGORY' | 'UNIT', id: string) => {
      if(!confirm('ต้องการลบรายการนี้? (ถ้ามีสินค้าใช้อยู่อาจมีปัญหาแสดงผล)')) return;
      const table = type === 'CATEGORY' ? 'master_categories' : 'master_units';
      await supabase.from(table).delete().eq('id', id);
      fetchMasterData();
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto font-sans min-h-screen bg-gray-50/50">
      <h1 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-800">
        <Settings className="text-blue-600"/> ตั้งค่าระบบ
      </h1>

      {/* Tabs Menu */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab('BRANCH')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'BRANCH' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <Store size={18}/> ข้อมูลร้าน & ใบเสร็จ
          </button>
          <button onClick={() => setActiveTab('CATEGORY')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'CATEGORY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <Layers size={18}/> หมวดหมู่สินค้า
          </button>
          <button onClick={() => setActiveTab('UNIT')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'UNIT' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <Tag size={18}/> หน่วยนับ
          </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        
        {/* --- Tab 1: Branch Settings --- */}
        {activeTab === 'BRANCH' && (
            <div className="space-y-6">
                <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2"><MapPin size={18}/> ข้อมูลสาขา (จะโชว์บนหัวบิล)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-bold text-gray-600">ชื่อร้าน</label><input type="text" className="w-full border p-2 rounded-lg" value={branch.name} onChange={e => setBranch({...branch, name: e.target.value})} /></div>
                    <div><label className="text-sm font-bold text-gray-600">โทรศัพท์</label><input type="text" className="w-full border p-2 rounded-lg" value={branch.phone} onChange={e => setBranch({...branch, phone: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="text-sm font-bold text-gray-600">ที่อยู่</label><textarea rows={2} className="w-full border p-2 rounded-lg" value={branch.address} onChange={e => setBranch({...branch, address: e.target.value})} /></div>
                </div>

                <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2 pt-4"><FileText size={18}/> ข้อความท้ายบิล</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><label className="text-sm font-bold text-gray-600">Header (ใต้ชื่อร้าน)</label><input type="text" className="w-full border p-2 rounded-lg" value={branch.receipt_header} onChange={e => setBranch({...branch, receipt_header: e.target.value})} /></div>
                     <div><label className="text-sm font-bold text-gray-600">Footer (ล่างสุด)</label><input type="text" className="w-full border p-2 rounded-lg" value={branch.receipt_footer} onChange={e => setBranch({...branch, receipt_footer: e.target.value})} /></div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSaveBranch} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg disabled:bg-gray-400">
                        <Save size={20}/> บันทึกข้อมูลร้าน
                    </button>
                </div>
            </div>
        )}

        {/* --- Tab 2 & 3: Categories & Units --- */}
        {(activeTab === 'CATEGORY' || activeTab === 'UNIT') && (
            <div className="max-w-xl">
                <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2 mb-4">
                    {activeTab === 'CATEGORY' ? <><Layers /> จัดการหมวดหมู่สินค้า</> : <><Tag /> จัดการหน่วยนับ</>}
                </h2>
                
                <div className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        placeholder={activeTab === 'CATEGORY' ? "ชื่อหมวดหมู่ใหม่..." : "ชื่อหน่วยนับใหม่..."}
                        className="flex-1 border-2 border-blue-100 p-3 rounded-xl focus:border-blue-500 outline-none"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddItem(activeTab)}
                    />
                    <button onClick={() => handleAddItem(activeTab)} className="bg-green-600 text-white px-4 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2"><Plus /> เพิ่ม</button>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {(activeTab === 'CATEGORY' ? categories : units).map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:bg-white hover:shadow-sm transition">
                            <span className="font-bold text-gray-700">{item.name}</span>
                            <button onClick={() => handleDeleteItem(activeTab, item.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                    ))}
                    {(activeTab === 'CATEGORY' ? categories : units).length === 0 && <div className="text-center text-gray-400 py-8">ยังไม่มีข้อมูล</div>}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}