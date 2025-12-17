'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Search,
    Plus, Package, X, Save, Calendar, FileText, Trash2
} from 'lucide-react';

export default function TransferPage() {
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]); // โหลดสินค้ามารอเลือก

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transferType, setTransferType] = useState<'in' | 'out'>('out'); // in=รับ, out=ส่ง

    // Form Data
    const [branchName, setBranchName] = useState('');
    const [note, setNote] = useState('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]); // สินค้าที่เลือกจะโอน

    // Search Products in Modal
    const [productSearch, setProductSearch] = useState('');

    // --- 1. Load Data ---
    useEffect(() => {
        fetchTransfers();
        fetchProducts();
    }, []);

    const fetchTransfers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('transfers')
            .select(`*, transfer_items (product_name, quantity)`)
            .order('created_at', { ascending: false });

        if (error) console.error('Error transfers:', error);
        else setTransfers(data || []);
        setLoading(false);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('name');
        setProducts(data || []);
    };

    // --- 2. Logic จัดการรายการโอน ---
    const openModal = (type: 'in' | 'out') => {
        setTransferType(type);
        setBranchName('');
        setNote('');
        setSelectedItems([]);
        setProductSearch('');
        setIsModalOpen(true);
    };

    const addProductToTransfer = (product: any) => {
        // เช็คว่ามีในรายการหรือยัง
        const existing = selectedItems.find(item => item.id === product.id);
        if (existing) {
            // เพิ่มจำนวน
            setSelectedItems(prev => prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            // เพิ่มใหม่
            setSelectedItems(prev => [...prev, { ...product, qty: 1 }]);
        }
    };

    const updateItemQty = (id: string, qty: number) => {
        if (qty <= 0) {
            setSelectedItems(prev => prev.filter(item => item.id !== id));
        } else {
            setSelectedItems(prev => prev.map(item => item.id === id ? { ...item, qty } : item));
        }
    };

    const confirmTransfer = async () => {
        if (!branchName) return alert('กรุณาระบุชื่อสาขา');
        if (selectedItems.length === 0) return alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');

        // 1. สร้างใบโอน
        const { data: transferData, error: transferError } = await supabase
            .from('transfers')
            .insert({
                type: transferType,
                branch_name: branchName,
                note: note
            })
            .select().single();

        if (transferError) return alert('บันทึกไม่สำเร็จ: ' + transferError.message);

        // 2. บันทึกรายการ
        const itemsPayload = selectedItems.map(item => ({
            transfer_id: transferData.id,
            product_id: item.id,
            product_name: item.name,
            quantity: item.qty
        }));
        await supabase.from('transfer_items').insert(itemsPayload);

        // 3. ตัด/เพิ่ม สต็อกจริง (สำคัญ!)
        for (const item of selectedItems) {
            // ดึงสต็อกปัจจุบันก่อน (เพื่อความชัวร์)
            const { data: currentP } = await supabase.from('products').select('stock').eq('id', item.id).single();
            if (currentP) {
                let newStock = currentP.stock;
                if (transferType === 'out') {
                    newStock -= item.qty; // ส่งออก = ตัดของ
                } else {
                    newStock += item.qty; // รับเข้า = เพิ่มของ
                }
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
            }
        }

        alert('บันทึกการโอนเรียบร้อย สต็อกถูกปรับปรุงแล้ว');
        setIsModalOpen(false);
        fetchTransfers();
    };

    // Filter Products for Search
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans overflow-hidden">

            {/* --- ฝั่งซ้าย: ประวัติการโอน --- */}
            <div className="w-full lg:w-1/2 bg-white border-r flex flex-col h-full">
                <div className="p-4 bg-purple-900 text-white shadow-md">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ArrowRightLeft size={32} /> โอนย้ายสินค้า
                    </h1>
                    <p className="text-purple-200 text-sm">จัดการสต็อกข้ามสาขา</p>
                </div>

                {/* ปุ่ม Action ใหญ่ๆ */}
                <div className="p-4 grid grid-cols-2 gap-4 border-b">
                    <button
                        onClick={() => openModal('out')}
                        className="flex flex-col items-center justify-center p-6 bg-red-50 border-2 border-red-200 rounded-2xl hover:bg-red-100 hover:scale-105 transition group"
                    >
                        <div className="bg-red-200 p-3 rounded-full mb-2 group-hover:bg-red-300">
                            <ArrowUpRight size={32} className="text-red-700" />
                        </div>
                        <span className="text-red-800 font-bold text-lg">ส่งของออก</span>
                        <span className="text-xs text-red-500">ไปสาขาอื่น (ตัดสต็อก)</span>
                    </button>

                    <button
                        onClick={() => openModal('in')}
                        className="flex flex-col items-center justify-center p-6 bg-green-50 border-2 border-green-200 rounded-2xl hover:bg-green-100 hover:scale-105 transition group"
                    >
                        <div className="bg-green-200 p-3 rounded-full mb-2 group-hover:bg-green-300">
                            <ArrowDownLeft size={32} className="text-green-700" />
                        </div>
                        <span className="text-green-800 font-bold text-lg">รับของเข้า</span>
                        <span className="text-xs text-green-500">จากสาขาอื่น (เพิ่มสต็อก)</span>
                    </button>
                </div>

                {/* รายการประวัติ */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <h3 className="font-bold text-gray-500 mb-2 flex items-center gap-2"><FileText size={18} /> ประวัติล่าสุด</h3>
                    {loading ? <div className="text-center text-gray-400">กำลังโหลด...</div> : (
                        transfers.map(t => (
                            <div key={t.id} className="bg-white border p-4 rounded-xl shadow-sm flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${t.type === 'out' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {t.type === 'out' ? <ArrowUpRight /> : <ArrowDownLeft />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800 text-lg">
                                            {t.type === 'out' ? 'ส่งไป' : 'รับจาก'} {t.branch_name}
                                        </div>
                                        <div className="text-sm text-gray-500 flex gap-2">
                                            <span>{new Date(t.created_at).toLocaleDateString('th-TH')}</span>
                                            <span>• {t.transfer_items.length} รายการ</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {t.transfer_items.map((item: any, i: number) => (
                                        <div key={i} className="text-sm text-gray-600">
                                            {item.product_name} <span className="font-bold">x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- ฝั่งขวา (เฉพาะจอใหญ่) --- */}
            <div className="hidden lg:flex w-1/2 bg-gray-50 items-center justify-center text-gray-400 flex-col">
                <Package size={80} className="opacity-20 mb-4" />
                <p className="text-xl">เลือกเมนูฝั่งซ้ายเพื่อทำรายการ</p>
            </div>

            {/* --- Modal ทำรายการโอน --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className={`p-4 text-white flex justify-between items-center ${transferType === 'out' ? 'bg-red-600' : 'bg-green-600'}`}>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {transferType === 'out' ? <ArrowUpRight size={32} /> : <ArrowDownLeft size={32} />}
                                {transferType === 'out' ? 'ส่งสินค้าออก (ตัดสต็อก)' : 'รับสินค้าเข้า (เพิ่มสต็อก)'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={28} /></button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            {/* Form & Selected Items (Left) */}
                            <div className="flex-1 p-4 overflow-y-auto border-r">
                                <div className="mb-4">
                                    <label className="block text-gray-700 font-bold mb-1">
                                        {transferType === 'out' ? 'ส่งไปที่สาขาไหน?' : 'รับมาจากสาขาไหน?'}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border-2 border-gray-300 rounded-xl p-3 text-lg outline-none focus:border-blue-500"
                                        placeholder="ระบุชื่อสาขา..."
                                        value={branchName}
                                        onChange={e => setBranchName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 font-bold mb-1">รายการสินค้า</label>
                                    <div className="space-y-2 bg-gray-50 p-2 rounded-xl min-h-[200px]">
                                        {selectedItems.length === 0 ? (
                                            <div className="text-center text-gray-400 py-8">เลือกสินค้าจากรายการขวามือ 👉</div>
                                        ) : (
                                            selectedItems.map((item) => (
                                                <div key={item.id} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <div className="font-bold">{item.name}</div>
                                                        <div className="text-xs text-gray-500">คงเหลือ: {item.stock}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => updateItemQty(item.id, item.qty - 1)} className="w-8 h-8 bg-gray-200 rounded text-red-600 font-bold">-</button>
                                                        <span className="font-bold text-xl w-8 text-center">{item.qty}</span>
                                                        <button onClick={() => updateItemQty(item.id, item.qty + 1)} className="w-8 h-8 bg-gray-200 rounded text-green-600 font-bold">+</button>
                                                        <button onClick={() => updateItemQty(item.id, 0)} className="ml-2 text-red-400"><Trash2 size={18} /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 font-bold mb-1">หมายเหตุ (ถ้ามี)</label>
                                    <textarea className="w-full border p-2 rounded-xl" rows={2} value={note} onChange={e => setNote(e.target.value)}></textarea>
                                </div>
                            </div>

                            {/* Product Selector (Right) */}
                            <div className="w-full lg:w-1/3 bg-gray-50 p-4 flex flex-col border-l">
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาสินค้า..."
                                        className="w-full pl-9 p-2 rounded-lg border outline-none"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {filteredProducts.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => addProductToTransfer(p)}
                                            className="bg-white p-2 rounded-lg border cursor-pointer hover:border-blue-500 transition active:scale-95"
                                        >
                                            <div className="font-bold text-sm text-gray-700">{p.name}</div>
                                            <div className="text-xs text-gray-400 flex justify-between">
                                                <span>{p.formula}</span>
                                                <span>มี {p.stock}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl">ยกเลิก</button>
                            <button
                                onClick={confirmTransfer}
                                className={`px-8 py-3 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex items-center gap-2 ${transferType === 'out' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                <Save /> ยืนยัน{transferType === 'out' ? 'ส่งออก' : 'รับเข้า'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}