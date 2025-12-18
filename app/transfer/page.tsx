'use client';

import React, { useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { ArrowRightLeft, Package } from 'lucide-react';

export default function TransferPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [targetBranch, setTargetBranch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const initData = async () => {
            const { data: b } = await supabase.from('branches').select('*').neq('id', CURRENT_BRANCH_ID);
            setBranches(b || []);
            const { data: p } = await supabase.from('products').select('id, name, inventory(quantity)').eq('inventory.branch_id', CURRENT_BRANCH_ID);
            setProducts(p?.map((i: any) => ({...i, stock: i.inventory[0]?.quantity || 0})) || []);
        };
        initData();
    }, []);

    const handleTransfer = async () => {
        if (!targetBranch || !selectedProduct || !qty) return alert('กรอกข้อมูลให้ครบ');
        setLoading(true);
        const { data, error } = await supabase.rpc('process_transfer', {
            p_from_branch: CURRENT_BRANCH_ID,
            p_to_branch: targetBranch,
            p_product_id: selectedProduct,
            p_qty: Number(qty),
            p_note: 'โอนผ่านระบบ'
        });

        if (error || !data.success) {
            alert('โอนล้มเหลว: ' + (error?.message || data?.message));
        } else {
            alert('✅ โอนย้ายสำเร็จ!');
            setQty('');
            // Reload products to update stock
            const { data: p } = await supabase.from('products').select('id, name, inventory(quantity)').eq('inventory.branch_id', CURRENT_BRANCH_ID);
            setProducts(p?.map((i: any) => ({...i, stock: i.inventory[0]?.quantity || 0})) || []);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><ArrowRightLeft /> โอนย้ายสินค้าข้ามสาขา</h1>
            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                <div>
                    <label className="block font-bold mb-1">โอนไปสาขาปลายทาง</label>
                    <select className="w-full border p-3 rounded-lg" value={targetBranch} onChange={e => setTargetBranch(e.target.value)}>
                        <option value="">-- เลือกสาขา --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">เลือกสินค้า (จากสาขานี้)</label>
                    <select className="w-full border p-3 rounded-lg" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                        <option value="">-- เลือกสินค้า --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (คงเหลือ: {p.stock})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">จำนวนที่โอน</label>
                    <input type="number" className="w-full border p-3 rounded-lg text-xl font-bold" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
                </div>
                <button onClick={handleTransfer} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400">
                    {loading ? 'กำลังประมวลผล...' : 'ยืนยันการโอน'}
                </button>
            </div>
        </div>
    );
}