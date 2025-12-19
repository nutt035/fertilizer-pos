'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StockAlertBadgeProps {
    count: number;
    onClick?: () => void;
    className?: string;
}

export default function StockAlertBadge({ count, onClick, className = '' }: StockAlertBadgeProps) {
    if (count === 0) return null;

    return (
        <button
            onClick={onClick}
            className={`
                relative flex items-center gap-2 px-3 py-2 
                bg-red-100 hover:bg-red-200 text-red-700 
                rounded-xl font-bold text-sm transition
                ${className}
            `}
            title={`มี ${count} สินค้าใกล้หมดสต็อก`}
        >
            <AlertTriangle size={18} className="text-red-500" />
            <span>สินค้าใกล้หมด</span>
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                {count}
            </span>
        </button>
    );
}
