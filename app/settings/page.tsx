'use client';

import React, { useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { Settings, Save, MapPin, Phone, FileText } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [branch, setBranch] = useState({
    name: '',
    address: '',
    phone: '',
    tax_id: '',
    receipt_header: '', // ข้อความต้อนรับบนหัวบิล
    receipt_footer: ''  // ข้อความขอบคุณท้ายบิล
  });

  useEffect(() => {
    fetchBranchInfo();
  }, []);

  const fetchBranchInfo = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', CURRENT_BRANCH_ID)
      .single();

    if (data) {
        setBranch({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            tax_id: data.tax_id || '',
            receipt_header: data.receipt_header || 'ยินดีต้อนรับ',
            receipt_footer: data.receipt_footer || 'ขอบคุณที่อุดหนุน'
        });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('branches')
      .update(branch)
      .eq('id', CURRENT_BRANCH_ID);

    if (error) {
        alert('บันทึกไม่สำเร็จ: ' + error.message);
    } else {
        alert('✅ บันทึกข้อมูลร้านค้าเรียบร้อย');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
        <Settings className="text-blue-600"/> ตั้งค่าร้านค้า / ใบเสร็จ
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-6">
        
        {/* ข้อมูลทั่วไป */}
        <div>
            <h2 className="text-lg font-bold border-b pb-2 mb-4 text-gray-700 flex items-center gap-2"><MapPin size={18}/> ข้อมูลสาขา</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-gray-600 mb-1 text-sm font-bold">ชื่อร้าน / สาขา</label>
                    <input type="text" className="w-full border p-2 rounded-lg" value={branch.name} onChange={e => setBranch({...branch, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-gray-600 mb-1 text-sm font-bold">เลขผู้เสียภาษี (Tax ID)</label>
                    <input type="text" className="w-full border p-2 rounded-lg" value={branch.tax_id} onChange={e => setBranch({...branch, tax_id: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-gray-600 mb-1 text-sm font-bold">ที่อยู่</label>
                    <textarea rows={2} className="w-full border p-2 rounded-lg" value={branch.address} onChange={e => setBranch({...branch, address: e.target.value})} />
                </div>
                <div>
                    <label className="block text-gray-600 mb-1 text-sm font-bold">เบอร์โทรศัพท์</label>
                    <input type="text" className="w-full border p-2 rounded-lg" value={branch.phone} onChange={e => setBranch({...branch, phone: e.target.value})} />
                </div>
            </div>
        </div>

        {/* ข้อความบนใบเสร็จ */}
        <div>
            <h2 className="text-lg font-bold border-b pb-2 mb-4 text-gray-700 flex items-center gap-2"><FileText size={18}/> ข้อความบนใบเสร็จ</h2>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-gray-600 mb-1 text-sm font-bold">ข้อความหัวบิล (Header)</label>
                    <input type="text" placeholder="เช่น ยินดีต้อนรับสู่ร้าน..." className="w-full border p-2 rounded-lg" value={branch.receipt_header} onChange={e => setBranch({...branch, receipt_header: e.target.value})} />
                    <p className="text-xs text-gray-400 mt-1">จะแสดงอยู่ใต้ชื่อร้าน</p>
                </div>
                <div>
                    <label className="block text-gray-600 mb-1 text-sm font-bold">ข้อความท้ายบิล (Footer)</label>
                    <input type="text" placeholder="เช่น สินค้าซื้อแล้วไม่รับคืน" className="w-full border p-2 rounded-lg" value={branch.receipt_footer} onChange={e => setBranch({...branch, receipt_footer: e.target.value})} />
                    <p className="text-xs text-gray-400 mt-1">จะแสดงอยู่ล่างสุดของใบเสร็จ</p>
                </div>
            </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
            <button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:bg-gray-400">
                <Save size={20}/> {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
        </div>

      </div>
    </div>
  );
}