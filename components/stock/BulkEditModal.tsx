'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, DollarSign, Search, X, Package } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { supabase } from '../../lib/supabase';

interface ProductRow {
    id: string;
    name: string;
    size: string;  // ขนาดสินค้า
    image_url?: string; // รูปสินค้า
    cost: number;
    price: number;
    stock: number;
    originalCost: number;  // เก็บ cost ตอนเปิด modal เพื่อใช้ filter
    hasChanged: boolean;
}

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Array<{
        id: string;
        name: string;
        cost: number;
        price: number;
        stock: number;
        [key: string]: any;  // รองรับ fields อื่นๆ จาก StockProduct
    }>;
    onSaveComplete: () => void;
}

export default function BulkEditModal({
    isOpen,
    onClose,
    products,
    onSaveComplete
}: BulkEditModalProps) {
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [showOnlyMissingCost, setShowOnlyMissingCost] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const toast = useToast();
    const firstInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ใช้ ref เก็บ isOpen ก่อนหน้า เพื่อเช็คว่าเปิด modal ใหม่หรือไม่
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        // รัน only เมื่อ modal เพิ่งเปิดขึ้นมา (false -> true)
        if (isOpen && !prevIsOpenRef.current) {
            // แปลง products เป็น rows
            const productRows = products.map(p => ({
                id: p.id,
                name: p.name,
                size: p.size || '',  // ขนาดสินค้า
                image_url: p.image_url || '',  // รูปสินค้า
                cost: p.cost || 0,
                price: p.price || 0,
                stock: p.stock || 0,
                originalCost: p.cost || 0,  // เก็บ cost เดิมไว้ filter
                hasChanged: false
            }));
            setRows(productRows);
            setSearchQuery(''); // Reset search เมื่อเปิด modal ใหม่
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, products]);

    const updateRow = (id: string, field: 'cost' | 'price' | 'size', value: number | string) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value, hasChanged: true } : row
        ));
    };

    const handleSaveAll = async () => {
        const changedRows = rows.filter(row => row.hasChanged);
        if (changedRows.length === 0) {
            toast.warning('ยังไม่มีการเปลี่ยนแปลง');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const row of changedRows) {
                const { error } = await supabase
                    .from('products')
                    .update({
                        size: row.size || null,
                        cost: row.cost,
                        price: row.price
                    })
                    .eq('id', row.id);

                if (error) {
                    console.error('Error updating product:', error);
                    errorCount++;
                } else {
                    successCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`บันทึกสำเร็จ ${successCount} รายการ!`);
                onSaveComplete();
                onClose();
            }
            if (errorCount > 0) {
                toast.error(`มี ${errorCount} รายการที่บันทึกไม่สำเร็จ`);
            }
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter products - ใช้ originalCost เพื่อไม่ให้สินค้าหายตอนพิมพ์
    let displayRows = rows;
    if (showOnlyMissingCost) {
        displayRows = rows.filter(row => row.originalCost === 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        displayRows = displayRows.filter(row =>
            row.name.toLowerCase().includes(query)
        );
    }

    const changedCount = rows.filter(row => row.hasChanged).length;
    const missingCostCount = rows.filter(row => row.originalCost === 0).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="แก้ไขสินค้าด่วน (ขนาด/ราคา)"
            headerColor="bg-amber-600"
            size="full"
            closeOnOutsideClick={false}
            footer={
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
                    <div className="text-gray-500 text-sm sm:text-base">
                        แก้ไขแล้ว <span className="font-bold text-amber-600">{changedCount}</span> รายการ
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || changedCount === 0}
                        className="w-full sm:w-auto bg-amber-600 text-white px-6 sm:px-8 py-3 rounded-lg font-bold text-base sm:text-lg hover:bg-amber-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                        {saving ? 'กำลังบันทึก...' : (
                            <>
                                <Save size={20} /> บันทึกทั้งหมด ({changedCount})
                            </>
                        )}
                    </button>
                </div>
            }
        >
            {/* Search Bar */}
            <div className="relative mb-4">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 ค้นหาชื่อสินค้า..."
                    className="w-full pl-12 pr-12 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Filter Toggle */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                <button
                    onClick={() => setShowOnlyMissingCost(true)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base transition ${showOnlyMissingCost
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-600 border hover:bg-gray-100'
                        }`}
                >
                    ⚠️ ไม่มีทุน ({missingCostCount})
                </button>
                <button
                    onClick={() => setShowOnlyMissingCost(false)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base transition ${!showOnlyMissingCost
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-600 border hover:bg-gray-100'
                        }`}
                >
                    📦 ทั้งหมด ({rows.length})
                </button>
            </div>

            {displayRows.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">
                        {searchQuery
                            ? `ไม่พบสินค้า "${searchQuery}"`
                            : showOnlyMissingCost
                                ? '🎉 สินค้าทุกตัวมีราคาทุนแล้ว!'
                                : 'ไม่มีสินค้า'
                        }
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3">
                        {displayRows.map((row, index) => (
                            <div
                                key={row.id}
                                className={`p-4 rounded-xl border-2 ${row.hasChanged
                                    ? 'border-amber-400 bg-amber-50'
                                    : 'border-gray-200 bg-white'
                                    }`}
                            >
                                {/* Product Image, Name & Stock */}
                                <div className="flex items-start gap-3 mb-3">
                                    {/* Product Image */}
                                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 border">
                                        {row.image_url ? (
                                            <img
                                                src={row.image_url}
                                                alt={row.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Package size={24} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-800 text-base leading-tight mb-2 truncate">
                                            {row.name}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 font-medium">ขนาด</label>
                                            <input
                                                type="text"
                                                value={row.size || ''}
                                                onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                                                className="w-full border-2 border-purple-200 rounded-lg px-2 py-1 text-sm font-medium text-purple-700 bg-purple-50"
                                                placeholder="เช่น 50 กก."
                                            />
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-sm font-bold flex-shrink-0 ${row.stock > 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-600'
                                        }`}>
                                        {row.stock}
                                    </div>
                                </div>

                                {/* Price Inputs */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium mb-1 block">ราคาทุน</label>
                                        <input
                                            ref={index === 0 ? firstInputRef : null}
                                            type="number"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={row.cost || ''}
                                            onChange={(e) => updateRow(row.id, 'cost', Number(e.target.value))}
                                            className={`w-full border-2 rounded-lg px-3 py-3 text-right text-lg font-bold ${row.cost === 0
                                                ? 'border-amber-400 bg-amber-50'
                                                : 'border-gray-200'
                                                }`}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium mb-1 block">ราคาขาย</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={row.price || ''}
                                            onChange={(e) => updateRow(row.id, 'price', Number(e.target.value))}
                                            className="w-full border-2 border-gray-200 rounded-lg px-3 py-3 text-right text-lg font-bold text-blue-600"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead className="bg-gray-50 text-gray-600 text-left border-b sticky top-0">
                                <tr>
                                    <th className="p-3 w-10">#</th>
                                    <th className="p-3 w-16">รูป</th>
                                    <th className="p-3">ชื่อสินค้า</th>
                                    <th className="p-3 w-28">ขนาด</th>
                                    <th className="p-3 w-20 text-center">คงเหลือ</th>
                                    <th className="p-3 w-32 text-right">ราคาทุน</th>
                                    <th className="p-3 w-32 text-right">ราคาขาย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.map((row, index) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b hover:bg-blue-50/50 ${row.hasChanged ? 'bg-amber-50' : ''}`}
                                    >
                                        <td className="p-3 text-gray-400 text-center">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden border">
                                                {row.image_url ? (
                                                    <img
                                                        src={row.image_url}
                                                        alt={row.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Package size={20} className="text-gray-300" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-800">{row.name}</div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={row.size || ''}
                                                onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                                                className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm font-bold text-purple-700 bg-purple-50 focus:border-purple-400 focus:outline-none"
                                                placeholder="-"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`font-bold ${row.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {row.stock}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                ref={index === 0 ? firstInputRef : null}
                                                type="number"
                                                value={row.cost || ''}
                                                onChange={(e) => updateRow(row.id, 'cost', Number(e.target.value))}
                                                className={`w-full border-2 rounded-lg px-4 py-3 text-right text-lg font-bold ${row.cost === 0
                                                    ? 'border-amber-400 bg-amber-50'
                                                    : 'border-gray-200'
                                                    }`}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                value={row.price || ''}
                                                onChange={(e) => updateRow(row.id, 'price', Number(e.target.value))}
                                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-right text-lg font-bold text-blue-600"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Result count for search */}
            {searchQuery && displayRows.length > 0 && (
                <div className="mt-3 text-center text-sm text-gray-500">
                    พบ {displayRows.length} รายการ
                </div>
            )}

            {/* Keyboard Tips - Hidden on mobile */}
            <div className="hidden sm:block mt-4 pt-4 border-t text-center text-sm text-gray-400">
                💡 กด <kbd className="px-2 py-1 bg-gray-100 rounded">Tab</kbd> หรือ <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> เพื่อไปช่องถัดไป
            </div>
        </Modal>
    );
}
