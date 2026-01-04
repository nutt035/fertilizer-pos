'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import {
    ArrowLeft,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Shield,
    Database,
    ShoppingCart,
    Package,
    History,
    RefreshCcw,
    Lock,
    Unlock
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface DataStats {
    ordersCount: number;
    orderItemsCount: number;
    movementsCount: number;
    totalSales: number;
}

export default function AdminToolsPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<DataStats | null>(null);
    const [confirmStep, setConfirmStep] = useState(0);
    const [confirmText, setConfirmText] = useState('');
    const [actionType, setActionType] = useState<'orders' | 'movements' | 'all' | null>(null);

    // โหลดสถิติข้อมูล
    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const [ordersRes, itemsRes, movementsRes, salesRes] = await Promise.all([
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            supabase.from('order_items').select('id', { count: 'exact', head: true }),
            supabase.from('inventory_movements').select('id', { count: 'exact', head: true }),
            supabase.from('orders').select('grand_total').eq('status', 'COMPLETED')
        ]);

        const totalSales = salesRes.data?.reduce((sum, o) => sum + (o.grand_total || 0), 0) || 0;

        setStats({
            ordersCount: ordersRes.count || 0,
            orderItemsCount: itemsRes.count || 0,
            movementsCount: movementsRes.count || 0,
            totalSales
        });
    };

    // เริ่มกระบวนการลบ
    const startDelete = (type: 'orders' | 'movements' | 'all') => {
        setActionType(type);
        setConfirmStep(1);
        setConfirmText('');
    };

    // ยกเลิกการลบ
    const cancelDelete = () => {
        setActionType(null);
        setConfirmStep(0);
        setConfirmText('');
    };

    // ลบบิล/ออเดอร์
    const deleteOrders = async () => {
        setLoading(true);
        try {
            // ลบ order_items ก่อน (foreign key)
            const { error: itemsError } = await supabase.from('order_items').delete().gte('id', '00000000-0000-0000-0000-000000000000');
            if (itemsError) throw itemsError;

            // ลบ orders
            const { error: ordersError } = await supabase.from('orders').delete().gte('id', '00000000-0000-0000-0000-000000000000');
            if (ordersError) throw ordersError;

            toast.success('🗑️ ลบบิล/ยอดขายทั้งหมดเรียบร้อย!');
        } catch (error: any) {
            toast.error('ลบไม่สำเร็จ: ' + error.message);
        } finally {
            setLoading(false);
            cancelDelete();
            fetchStats();
        }
    };

    // ลบประวัติการเคลื่อนไหวสต็อก
    const deleteMovements = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('inventory_movements').delete().gte('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
            toast.success('🗑️ ลบประวัติสต็อกทั้งหมดเรียบร้อย!');
        } catch (error: any) {
            toast.error('ลบไม่สำเร็จ: ' + error.message);
        } finally {
            setLoading(false);
            cancelDelete();
            fetchStats();
        }
    };

    // ลบทั้งหมด (orders + movements)
    const deleteAll = async () => {
        setLoading(true);
        try {
            // ลบ order_items
            await supabase.from('order_items').delete().gte('id', '00000000-0000-0000-0000-000000000000');
            // ลบ orders
            await supabase.from('orders').delete().gte('id', '00000000-0000-0000-0000-000000000000');
            // ลบ movements
            await supabase.from('inventory_movements').delete().gte('id', '00000000-0000-0000-0000-000000000000');

            toast.success('🗑️ ลบข้อมูลทดสอบทั้งหมดเรียบร้อย!');
        } catch (error: any) {
            toast.error('ลบไม่สำเร็จ: ' + error.message);
        } finally {
            setLoading(false);
            cancelDelete();
            fetchStats();
        }
    };

    // ดำเนินการลบตามประเภท
    const executeDelete = () => {
        if (confirmText !== 'ยืนยันลบ') {
            toast.warning('กรุณาพิมพ์ "ยืนยันลบ" ให้ถูกต้อง');
            return;
        }

        switch (actionType) {
            case 'orders':
                deleteOrders();
                break;
            case 'movements':
                deleteMovements();
                break;
            case 'all':
                deleteAll();
                break;
        }
    };

    const getActionLabel = () => {
        switch (actionType) {
            case 'orders': return 'บิล/ยอดขายทั้งหมด';
            case 'movements': return 'ประวัติสต็อกทั้งหมด';
            case 'all': return 'ข้อมูลทดสอบทั้งหมด (บิล + ประวัติสต็อก)';
            default: return '';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm">
                <Link href="/settings" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition">
                    <ArrowLeft size={20} /> กลับ
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-xl">
                        <Shield size={28} className="text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800">Admin Tools</h1>
                        <p className="text-sm text-gray-500">เครื่องมือจัดการข้อมูลระบบ</p>
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold text-amber-800">⚠️ คำเตือน: หน้านี้มีฟังก์ชันลบข้อมูล</h3>
                    <p className="text-amber-700 text-sm mt-1">
                        การลบข้อมูลจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                        และแนะนำให้สำรองข้อมูลก่อนทุกครั้ง
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <ShoppingCart size={16} />
                        <span className="text-sm">จำนวนบิล</span>
                    </div>
                    <div className="text-3xl font-black text-gray-800">
                        {stats?.ordersCount?.toLocaleString() || '-'}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-500">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Database size={16} />
                        <span className="text-sm">ยอดขายรวม</span>
                    </div>
                    <div className="text-3xl font-black text-green-600">
                        ฿{stats?.totalSales?.toLocaleString() || '0'}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Package size={16} />
                        <span className="text-sm">รายการสินค้าในบิล</span>
                    </div>
                    <div className="text-3xl font-black text-gray-800">
                        {stats?.orderItemsCount?.toLocaleString() || '-'}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <History size={16} />
                        <span className="text-sm">ประวัติสต็อก</span>
                    </div>
                    <div className="text-3xl font-black text-gray-800">
                        {stats?.movementsCount?.toLocaleString() || '-'}
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ลบบิล/ยอดขาย */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <ShoppingCart size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">ลบบิล/ยอดขาย</h3>
                            <p className="text-sm text-gray-500">ลบ orders และ order_items</p>
                        </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                        ลบบิลขายทั้งหมด รวมถึงรายการสินค้าในบิล
                        สต็อกปัจจุบันจะยังคงอยู่ ใช้เมื่อต้องการเคลียร์ยอดขายทดสอบ
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <div className="text-sm text-gray-600">ข้อมูลที่จะถูกลบ:</div>
                        <div className="font-bold text-blue-600">{stats?.ordersCount || 0} บิล, {stats?.orderItemsCount || 0} รายการ</div>
                    </div>
                    <button
                        onClick={() => startDelete('orders')}
                        disabled={loading || stats?.ordersCount === 0}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> ลบบิลทั้งหมด
                    </button>
                </div>

                {/* ลบประวัติสต็อก */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-orange-100 rounded-xl">
                            <History size={24} className="text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">ลบประวัติสต็อก</h3>
                            <p className="text-sm text-gray-500">ลบ inventory_movements</p>
                        </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                        ลบประวัติการรับ-จ่ายสต็อกทั้งหมด (Stock Card)
                        สต็อกปัจจุบันจะยังคงอยู่ ใช้เมื่อต้องการเริ่มบันทึกใหม่
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <div className="text-sm text-gray-600">ข้อมูลที่จะถูกลบ:</div>
                        <div className="font-bold text-orange-600">{stats?.movementsCount || 0} รายการ</div>
                    </div>
                    <button
                        onClick={() => startDelete('movements')}
                        disabled={loading || stats?.movementsCount === 0}
                        className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> ลบประวัติสต็อก
                    </button>
                </div>

                {/* ลบทั้งหมด */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-red-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-red-700">ลบข้อมูลทดสอบทั้งหมด</h3>
                            <p className="text-sm text-gray-500">เริ่มต้นใหม่สะอาด</p>
                        </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                        ลบทั้งบิลขายและประวัติสต็อก เหมาะสำหรับการเริ่มใช้งานจริง
                        หลังจากทดสอบระบบเสร็จแล้ว
                    </p>
                    <div className="bg-red-50 rounded-xl p-3 mb-4">
                        <div className="text-sm text-red-600">⚠️ ข้อมูลที่จะถูกลบ:</div>
                        <div className="font-bold text-red-700">
                            {stats?.ordersCount || 0} บิล + {stats?.movementsCount || 0} ประวัติสต็อก
                        </div>
                    </div>
                    <button
                        onClick={() => startDelete('all')}
                        disabled={loading || (stats?.ordersCount === 0 && stats?.movementsCount === 0)}
                        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> ลบข้อมูลทดสอบทั้งหมด
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmStep > 0 && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-red-600 p-4 flex items-center gap-3">
                            <AlertTriangle size={28} className="text-white" />
                            <h3 className="text-white font-bold text-xl">ยืนยันการลบข้อมูล</h3>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {confirmStep === 1 && (
                                <div className="space-y-4">
                                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                                        <p className="font-bold text-red-800 mb-2">คุณกำลังจะลบ:</p>
                                        <p className="text-red-700 text-lg">{getActionLabel()}</p>
                                    </div>
                                    <p className="text-gray-600">
                                        การดำเนินการนี้ <span className="font-bold text-red-600">ไม่สามารถยกเลิกได้</span>
                                        ข้อมูลจะถูกลบถาวร
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={cancelDelete}
                                            className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={() => setConfirmStep(2)}
                                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2"
                                        >
                                            <Unlock size={18} /> ดำเนินการต่อ
                                        </button>
                                    </div>
                                </div>
                            )}

                            {confirmStep === 2 && (
                                <div className="space-y-4">
                                    <p className="text-gray-700">
                                        พิมพ์ <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">ยืนยันลบ</span> เพื่อดำเนินการ
                                    </p>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="พิมพ์ที่นี่..."
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:outline-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={cancelDelete}
                                            className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={executeDelete}
                                            disabled={loading || confirmText !== 'ยืนยันลบ'}
                                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <RefreshCcw size={18} className="animate-spin" /> กำลังลบ...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={18} /> ลบข้อมูล
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Info Section */}
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-green-600" />
                    ข้อมูลที่จะไม่ถูกลบ (ปลอดภัย)
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <Package size={24} className="mx-auto text-green-600 mb-1" />
                        <div className="font-bold text-green-800">สินค้า</div>
                        <div className="text-sm text-green-600">รายการสินค้าทั้งหมด</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <Database size={24} className="mx-auto text-green-600 mb-1" />
                        <div className="font-bold text-green-800">สต็อกปัจจุบัน</div>
                        <div className="text-sm text-green-600">จำนวนคงเหลือ</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <div className="text-2xl mb-1">📁</div>
                        <div className="font-bold text-green-800">หมวดหมู่/หน่วย</div>
                        <div className="text-sm text-green-600">ข้อมูลหลัก</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <div className="text-2xl mb-1">👥</div>
                        <div className="font-bold text-green-800">ลูกค้า</div>
                        <div className="text-sm text-green-600">รายชื่อลูกค้า</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
