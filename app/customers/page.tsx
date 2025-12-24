'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import {
    Users, Search, Plus, Phone, User, History,
    Edit, Save, X, ShoppingBag, ArrowLeft, Trash2
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();

    // State สำหรับ Modal และ รายละเอียด
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null); // ลูกค้าที่ถูกเลือกดูประวัติ
    const [customerHistory, setCustomerHistory] = useState<any[]>([]); // ประวัติการซื้อ
    const [formData, setFormData] = useState({ id: '', name: '', nickname: '', phone: '', line_id: '' });

    // --- 1. โหลดข้อมูลลูกค้า ---
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error:', error);
            toast.error('โหลดข้อมูลลูกค้าไม่สำเร็จ');
        } else {
            setCustomers(data || []);
        }
        setLoading(false);
    };

    // --- 2. ดูประวัติการซื้อ (เมื่อจิ้มที่ลูกค้า) ---
    const handleSelectCustomer = async (customer: any) => {
        setSelectedCustomer(customer);
        setFormData(customer); // เตรียมข้อมูลเผื่อกดแก้ไข

        // ดึงประวัติการซื้อของคนนี้
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (product_name, quantity, price)
      `)
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false }); // ล่าสุดขึ้นก่อน

        if (!error) {
            setCustomerHistory(orders || []);
        }
    };

    // --- 3. เพิ่ม/แก้ไข ลูกค้า ---
    const openAddModal = () => {
        setSelectedCustomer(null); // เคลียร์การเลือก
        setFormData({ id: '', name: '', nickname: '', phone: '', line_id: '' });
        setIsModalOpen(true);
    };

    const openEditModal = () => {
        // ใช้ข้อมูลจาก selectedCustomer ที่มีอยู่แล้ว
        setFormData(selectedCustomer);
        setIsModalOpen(true);
    };

    const saveCustomer = async () => {
        if (!formData.name) {
            toast.warning('กรุณาใส่ชื่อลูกค้า');
            return;
        }

        const customerData = {
            name: formData.name,
            nickname: formData.nickname,
            phone: formData.phone,
            line_id: formData.line_id
        };

        if (formData.id) {
            // Update
            const { error } = await supabase.from('customers').update(customerData).eq('id', formData.id);
            if (error) {
                toast.error('แก้ไขไม่สำเร็จ: ' + error.message);
                return;
            }
        } else {
            // Insert
            const { error } = await supabase.from('customers').insert(customerData);
            if (error) {
                toast.error('เพิ่มไม่สำเร็จ: ' + error.message);
                return;
            }
        }

        setIsModalOpen(false);
        fetchCustomers(); // โหลดใหม่
        // ถ้ากำลังดูคนนี้อยู่ ก็อัปเดตหน้าจอรายละเอียดด้วย
        if (selectedCustomer && selectedCustomer.id === formData.id) {
            setSelectedCustomer({ ...selectedCustomer, ...customerData });
        }
        toast.success('บันทึกเรียบร้อย');
    };

    // --- 4. ลบลูกค้า ---
    const handleDelete = async () => {
        if (!selectedCustomer) return;
        if (confirm(`ยืนยันลบข้อมูลคุณ "${selectedCustomer.name}" ? \n(ประวัติการซื้อจะยังอยู่ แต่จะไม่แสดงชื่อลูกค้า)`)) {
            const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
            if (error) toast.error('ลบไม่ได้: ' + error.message);
            else {
                setSelectedCustomer(null);
                fetchCustomers();
            }
        }
    };

    // กรองรายชื่อ
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nickname && c.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans overflow-hidden">

            {/* --- ฝั่งซ้าย: รายชื่อลูกค้า (30-40%) --- */}
            <div className={`w-full lg:w-1/3 bg-white border-r flex flex-col h-full ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>

                {/* Header */}
                <div className="p-4 bg-orange-100 border-b border-orange-200">
                    <h1 className="text-2xl font-black text-orange-900 flex items-center gap-2">
                        <Users size={28} /> ทะเบียนลูกค้า
                    </h1>
                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ / ชื่อเล่น / เบอร์..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-orange-200 outline-none focus:border-orange-500 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <button
                        onClick={openAddModal}
                        className="w-full mb-2 py-4 border-2 border-dashed border-orange-300 text-orange-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-50 transition"
                    >
                        <Plus /> เพิ่มลูกค้าใหม่
                    </button>

                    {loading ? <div className="text-center p-4 text-gray-400">กำลังโหลด...</div> : (
                        filteredCustomers.map((cust) => (
                            <div
                                key={cust.id}
                                onClick={() => handleSelectCustomer(cust)}
                                className={`p-4 rounded-xl border-b cursor-pointer transition hover:bg-gray-50 flex items-center justify-between group ${selectedCustomer?.id === cust.id ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${selectedCustomer?.id === cust.id ? 'bg-orange-500' : 'bg-gray-300 group-hover:bg-orange-300'}`}>
                                        {cust.nickname ? cust.nickname[0] : cust.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">
                                            {cust.nickname ? <>{cust.nickname} <span className="text-sm font-normal text-gray-500">({cust.name})</span></> : cust.name}
                                        </div>
                                        <div className="text-sm text-gray-400 flex items-center gap-1">
                                            <Phone size={12} /> {cust.phone || '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-300 group-hover:text-orange-400">
                                    <User />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- ฝั่งขวา: รายละเอียด & ประวัติ (60-70%) --- */}
            <div className={`w-full lg:w-2/3 bg-gray-50 flex flex-col h-full ${!selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>

                {selectedCustomer ? (
                    <>
                        {/* Detail Header */}
                        <div className="bg-white p-6 shadow-sm border-b flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedCustomer(null)} className="lg:hidden p-2 bg-gray-100 rounded-full"><ArrowLeft /></button>
                                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-md">
                                    {selectedCustomer.nickname ? selectedCustomer.nickname[0] : selectedCustomer.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-800">{selectedCustomer.nickname || selectedCustomer.name}</h2>
                                    <p className="text-gray-500 text-lg">{selectedCustomer.nickname ? `ชื่อจริง: ${selectedCustomer.name}` : ''}</p>
                                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Phone size={14} /> {selectedCustomer.phone || 'ไม่มีเบอร์'}</span>
                                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-green-600 font-bold">LINE: {selectedCustomer.line_id || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={openEditModal} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100"><Edit size={18} /> แก้ไข</button>
                                <button onClick={handleDelete} className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100"><Trash2 size={18} /></button>
                            </div>
                        </div>

                        {/* Purchase History */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <History className="text-orange-500" /> ประวัติการซื้อ ({customerHistory.length})
                            </h3>

                            {customerHistory.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 bg-white rounded-xl border-2 border-dashed">
                                    <ShoppingBag size={48} className="mx-auto mb-2 opacity-20" />
                                    ยังไม่มีประวัติการซื้อ
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {customerHistory.map((order) => (
                                        <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                            <div className="flex justify-between items-center mb-2 border-b pb-2">
                                                <div className="text-gray-500 text-sm">
                                                    {new Date(order.created_at).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                                    <span className="mx-2">•</span>
                                                    {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </div>
                                                <div className="text-xl font-black text-blue-900">
                                                    {order.total_amount.toLocaleString()}.-
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {order.order_items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-gray-700">
                                                        <span>• {item.product_name}</span>
                                                        <span className="text-gray-400">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // State: ยังไม่ได้เลือกลูกค้า (โชว์เฉพาะจอใหญ่)
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Users size={80} className="opacity-10 mb-4" />
                        <p className="text-xl">เลือกลูกค้าจากฝั่งซ้าย</p>
                        <p className="text-sm">เพื่อดูรายละเอียดและประวัติการซื้อ</p>
                    </div>
                )}
            </div>

            {/* --- Modal: เพิ่ม/แก้ไข --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-orange-600 p-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xl">{formData.id ? 'แก้ไขข้อมูล' : 'เพิ่มลูกค้าใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white"><X /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">ชื่อเล่น / ฉายา (ที่เรียกง่ายๆ)</label>
                                <input type="text" className="w-full border-2 border-gray-300 rounded-xl p-3 text-lg focus:border-orange-500 outline-none" placeholder="เช่น ป้าแดง ท้ายซอย" value={formData.nickname} onChange={e => setFormData({ ...formData, nickname: e.target.value })} autoFocus />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">ชื่อ-นามสกุลจริง</label>
                                <input type="text" className="w-full border-2 border-gray-300 rounded-xl p-3 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 mb-1">เบอร์โทร</label>
                                    <input type="tel" className="w-full border-2 border-gray-300 rounded-xl p-3 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">LINE ID</label>
                                    <input type="text" className="w-full border-2 border-gray-300 rounded-xl p-3 outline-none" value={formData.line_id} onChange={e => setFormData({ ...formData, line_id: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-200 rounded-lg font-bold">ยกเลิก</button>
                            <button onClick={saveCustomer} className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 flex items-center gap-2"><Save size={18} /> บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}