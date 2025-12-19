'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StockDashboardProps {
    totalCost: number;
    totalValue: number;
    totalProfit: number;
    lowStockCount: number;
}

export default function StockDashboard({
    totalCost,
    totalValue,
    totalProfit,
    lowStockCount
}: StockDashboardProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                <div className="text-gray-500 text-sm">มูลค่าทุนรวม (บาท)</div>
                <div className="text-2xl font-bold text-gray-800">{totalCost.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                <div className="text-gray-500 text-sm">มูลค่าขายรวม (บาท)</div>
                <div className="text-2xl font-bold text-gray-800">{totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
                <div className="text-gray-500 text-sm">กำไรคาดการณ์</div>
                <div className="text-2xl font-bold text-purple-700">+{totalProfit.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                <div className="text-gray-500 text-sm">สินค้าใกล้หมด</div>
                <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle size={24} /> {lowStockCount} รายการ
                </div>
            </div>
        </div>
    );
}
