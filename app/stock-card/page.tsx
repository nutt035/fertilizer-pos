'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { ArrowLeft, History, Search, Package, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Scissors } from 'lucide-react';

interface Movement {
    id: string;
    type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUST' | 'SPLIT' | 'SALE';
    quantity: number;
    balance_after: number;
    reason?: string;
    ref_type?: string;
    created_at: string;
    products?: { name: string };
}

const typeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'STOCK_IN': { label: 'เติมสต็อก', color: 'text-green-600 bg-green-50', icon: <ArrowUpCircle size={16} /> },
    'STOCK_OUT': { label: 'ตัดสต็อก', color: 'text-red-600 bg-red-50', icon: <ArrowDownCircle size={16} /> },
    'ADJUST': { label: 'ปรับปรุง', color: 'text-blue-600 bg-blue-50', icon: <RefreshCcw size={16} /> },
    'SPLIT': { label: 'ตัดแบ่ง', color: 'text-orange-600 bg-orange-50', icon: <Scissors size={16} /> },
    'SALE': { label: 'ขาย', color: 'text-purple-600 bg-purple-50', icon: <Package size={16} /> },
};

export default function StockCardPage() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        fetchMovements();
    }, []);

    const fetchMovements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
                id,
                type,
                quantity,
                balance_after,
                reason,
                ref_type,
                created_at,
                products(name)
            `)
            .eq('branch_id', CURRENT_BRANCH_ID)
            .order('created_at', { ascending: false })
            .limit(500);

        if (!error && data) {
            setMovements(data as unknown as Movement[]);
        }
        setLoading(false);
    };

    // Filter movements
    const filteredMovements = movements.filter(m => {
        const matchesSearch = !searchTerm ||
            m.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.reason?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || m.type === filterType;
        return matchesSearch && matchesType;
    });

    // Group by date
    const groupedByDate: Record<string, Movement[]> = {};
    filteredMovements.forEach(m => {
        const date = new Date(m.created_at).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(m);
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 lg:p-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/stock" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition">
                        <ArrowLeft size={20} /> กลับ
                    </Link>
                    <h1 className="text-xl lg:text-2xl font-black text-gray-800 flex items-center gap-2">
                        <History className="text-blue-600" /> สต็อกการ์ด
                    </h1>
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="relative flex-1 lg:flex-none">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl w-full lg:w-64 focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-white font-bold"
                    >
                        <option value="all">ทุกประเภท</option>
                        <option value="STOCK_IN">เติมสต็อก</option>
                        <option value="STOCK_OUT">ตัดสต็อก</option>
                        <option value="ADJUST">ปรับปรุง</option>
                        <option value="SPLIT">ตัดแบ่ง</option>
                        <option value="SALE">ขาย</option>
                    </select>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-700 font-bold">
                    📊 แสดง {filteredMovements.length} รายการ
                </p>
            </div>

            {/* Movements List */}
            <div className="space-y-6">
                {Object.keys(groupedByDate).length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                        <History size={48} className="mx-auto mb-4 opacity-50" />
                        <p>ไม่พบรายการ</p>
                    </div>
                ) : (
                    Object.entries(groupedByDate).map(([date, dayMovements]) => (
                        <div key={date}>
                            <h3 className="font-bold text-gray-600 mb-3 text-sm">{date}</h3>
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className="divide-y divide-gray-100">
                                    {dayMovements.map(movement => {
                                        const typeInfo = typeLabels[movement.type] || { label: movement.type, color: 'text-gray-600 bg-gray-50', icon: null };
                                        const isPositive = movement.quantity > 0;

                                        return (
                                            <div key={movement.id} className="p-4 flex items-center gap-4">
                                                {/* Icon */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeInfo.color}`}>
                                                    {typeInfo.icon}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 truncate">
                                                        {movement.products?.name || 'ไม่ระบุ'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {typeInfo.label}
                                                        {movement.reason && ` - ${movement.reason}`}
                                                    </p>
                                                </div>

                                                {/* Quantity */}
                                                <div className="text-right">
                                                    <p className={`font-bold text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                        {isPositive ? '+' : ''}{movement.quantity}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        คงเหลือ: {movement.balance_after}
                                                    </p>
                                                </div>

                                                {/* Time */}
                                                <div className="text-right text-xs text-gray-400 w-16">
                                                    {new Date(movement.created_at).toLocaleTimeString('th-TH', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
