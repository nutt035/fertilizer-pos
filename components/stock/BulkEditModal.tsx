'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, DollarSign } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { supabase } from '../../lib/supabase';

interface ProductRow {
    id: string;
    name: string;
    cost: number;
    price: number;
    stock: number;
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
    const toast = useToast();
    const firstInputRef = useRef<HTMLInputElement>(null);

    // ใช้ ref เก็บ isOpen ก่อนหน้า เพื่อเช็คว่าเปิด modal ใหม่หรือไม่
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        // รัน only เมื่อ modal เพิ่งเปิดขึ้นมา (false -> true)
        if (isOpen && !prevIsOpenRef.current) {
            // แปลง products เป็น rows
            const productRows = products.map(p => ({
                id: p.id,
                name: p.name,
                cost: p.cost || 0,
                price: p.price || 0,
                stock: p.stock || 0,
                hasChanged: false
            }));
            setRows(productRows);
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, products]);

    const updateRow = (id: string, field: 'cost' | 'price', value: number) => {
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

    // Filter products
    let displayRows = rows;
    if (showOnlyMissingCost) {
        displayRows = rows.filter(row => row.cost === 0);
    }

    const changedCount = rows.filter(row => row.hasChanged).length;
    const missingCostCount = rows.filter(row => row.cost === 0).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="แก้ไขราคาด่วน"
            headerColor="bg-amber-600"
            size="full"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="text-gray-500">
                        แก้ไขแล้ว <span className="font-bold text-amber-600">{changedCount}</span> รายการ
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || changedCount === 0}
                        className="bg-amber-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-amber-700 flex items-center gap-2 disabled:bg-gray-400"
                    >
                        {saving ? 'กำลังบันทึก...' : (
                            <>
                                <Save size={24} /> บันทึกทั้งหมด ({changedCount})
                            </>
                        )}
                    </button>
                </div>
            }
        >
            {/* Filter Toggle */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                <button
                    onClick={() => setShowOnlyMissingCost(true)}
                    className={`px-4 py-2 rounded-lg font-bold transition ${showOnlyMissingCost
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-600 border hover:bg-gray-100'
                        }`}
                >
                    ⚠️ ยังไม่มีราคาทุน ({missingCostCount})
                </button>
                <button
                    onClick={() => setShowOnlyMissingCost(false)}
                    className={`px-4 py-2 rounded-lg font-bold transition ${!showOnlyMissingCost
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
                        {showOnlyMissingCost
                            ? '🎉 สินค้าทุกตัวมีราคาทุนแล้ว!'
                            : 'ไม่มีสินค้า'
                        }
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50 text-gray-600 text-left border-b sticky top-0">
                            <tr>
                                <th className="p-3 w-10">#</th>
                                <th className="p-3">ชื่อสินค้า</th>
                                <th className="p-3 w-32 text-center">คงเหลือ</th>
                                <th className="p-3 w-40 text-right">ราคาทุน</th>
                                <th className="p-3 w-40 text-right">ราคาขาย</th>
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
                                        <div className="font-bold text-gray-800">{row.name}</div>
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
            )}

            {/* Keyboard Tips */}
            <div className="mt-4 pt-4 border-t text-center text-sm text-gray-400">
                💡 กด <kbd className="px-2 py-1 bg-gray-100 rounded">Tab</kbd> หรือ <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> เพื่อไปช่องถัดไป
            </div>
        </Modal>
    );
}
