'use client';

import React from 'react';
import Modal from '../common/Modal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BreakdownItem {
    name: string;
    profit: number;
    sales: number;
    [key: string]: any;
}

interface ProfitBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: BreakdownItem[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3', '#eab308', '#22c55e'];

export default function ProfitBreakdownModal({
    isOpen,
    onClose,
    title,
    data
}: ProfitBreakdownModalProps) {
    const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);

    // Sort by profit desc
    const sortedData = [...data].sort((a, b) => b.profit - a.profit);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="lg"
        >
            <div className="flex flex-col lg:flex-row gap-6">
                {/* 1. Chart */}
                <div className="w-full lg:w-1/3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sortedData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="profit"
                                nameKey="name"
                            >
                                {sortedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `฿${value.toLocaleString()}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. Table */}
                <div className="w-full lg:w-2/3 overflow-y-auto max-h-[400px]">
                    <div className="bg-gray-50 rounded-lg p-2 mb-2 flex justify-between font-bold text-gray-600 text-sm">
                        <div className="w-1/2">รายการ</div>
                        <div className="w-1/4 text-right">กำไร (บาท)</div>
                        <div className="w-1/4 text-right">%</div>
                    </div>
                    <div className="space-y-1">
                        {sortedData.map((item, index) => {
                            const percent = totalProfit > 0 ? (item.profit / totalProfit) * 100 : 0;
                            return (
                                <div key={index} className="flex justify-between p-2 border-b border-gray-100 hover:bg-blue-50 transition rounded text-sm">
                                    <div className="w-1/2 flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span>{item.name}</span>
                                    </div>
                                    <div className="w-1/4 text-right font-bold text-green-600">
                                        +{item.profit.toLocaleString()}
                                    </div>
                                    <div className="w-1/4 text-right text-gray-500">
                                        {percent.toFixed(1)}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between font-black text-lg">
                        <div>รวมกำไร</div>
                        <div className="text-green-700">+{totalProfit.toLocaleString()} บาท</div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
