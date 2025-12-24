'use client';

import React, { useState, useEffect } from 'react';
import { Percent, DollarSign } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';

interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemName?: string;
    currentPrice: number;
    currentDiscount: number;
    currentDiscountType: 'percent' | 'fixed' | null;
    onApply: (amount: number, type: 'percent' | 'fixed') => void;
}

export default function DiscountModal({
    isOpen,
    onClose,
    itemName,
    currentPrice,
    currentDiscount,
    currentDiscountType,
    onApply
}: DiscountModalProps) {
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
    const [discountValue, setDiscountValue] = useState('');
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setDiscountType(currentDiscountType || 'fixed');
            setDiscountValue(currentDiscount > 0 ? currentDiscount.toString() : '');
        }
    }, [isOpen, currentDiscount, currentDiscountType]);

    const calculatedDiscount = () => {
        const value = parseFloat(discountValue) || 0;
        if (discountType === 'percent') {
            return (currentPrice * value) / 100;
        }
        return value;
    };

    const finalPrice = currentPrice - calculatedDiscount();

    const handleApply = () => {
        const value = parseFloat(discountValue) || 0;
        if (value < 0) {
            toast.warning('ส่วนลดต้องไม่ติดลบ');
            return;
        }
        if (discountType === 'percent' && value > 100) {
            toast.warning('ส่วนลดเป็น % ต้องไม่เกิน 100');
            return;
        }
        if (discountType === 'fixed' && value > currentPrice) {
            toast.warning('ส่วนลดต้องไม่เกินราคาสินค้า');
            return;
        }
        onApply(value, discountType);
        onClose();
    };

    const handleClear = () => {
        onApply(0, 'fixed');
        onClose();
    };

    // Quick discount buttons
    const quickDiscounts = discountType === 'percent'
        ? [5, 10, 15, 20, 25, 30]
        : [10, 20, 50, 100, 200, 500];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={itemName ? `ส่วนลด: ${itemName}` : 'ส่วนลดทั้งบิล'}
            headerColor="bg-pink-500"
            size="md"
            footer={
                <>
                    <button
                        onClick={handleClear}
                        className="px-6 py-3 rounded-xl font-bold text-lg text-gray-600 hover:bg-gray-200"
                    >
                        ลบส่วนลด
                    </button>
                    <button
                        onClick={handleApply}
                        className="bg-pink-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-pink-600"
                    >
                        ใช้ส่วนลด
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Type selector */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setDiscountType('fixed')}
                        className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition ${discountType === 'fixed'
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <DollarSign size={24} /> ลดเป็นบาท
                    </button>
                    <button
                        onClick={() => setDiscountType('percent')}
                        className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition ${discountType === 'percent'
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Percent size={24} /> ลดเป็น %
                    </button>
                </div>

                {/* Input */}
                <div className="relative">
                    <input
                        type="number"
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        placeholder="0"
                        className="w-full text-center text-4xl font-bold border-2 border-pink-200 rounded-xl p-4 focus:border-pink-500 outline-none"
                        min="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                        {discountType === 'percent' ? '%' : '฿'}
                    </span>
                </div>

                {/* Quick buttons */}
                <div className="grid grid-cols-3 gap-2">
                    {quickDiscounts.map(val => (
                        <button
                            key={val}
                            onClick={() => setDiscountValue(val.toString())}
                            className="py-3 bg-gray-100 rounded-xl font-bold text-lg hover:bg-pink-100 hover:text-pink-600 transition"
                        >
                            {discountType === 'percent' ? `${val}%` : `฿${val}`}
                        </button>
                    ))}
                </div>

                {/* Preview */}
                <div className="bg-pink-50 p-4 rounded-xl border border-pink-200">
                    <div className="flex justify-between text-gray-600">
                        <span>ราคาเดิม</span>
                        <span>฿{currentPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-pink-600 font-bold">
                        <span>ส่วนลด</span>
                        <span>-฿{calculatedDiscount().toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-pink-200" />
                    <div className="flex justify-between text-xl font-black">
                        <span>ราคาสุทธิ</span>
                        <span className={finalPrice < 0 ? 'text-red-500' : 'text-green-600'}>
                            ฿{finalPrice.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
