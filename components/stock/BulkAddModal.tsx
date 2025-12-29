'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Layers, Tag } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';

interface MasterData {
    id: string;
    name: string;
}

interface BulkProductRow {
    id: string;
    name: string;
    category_id: string;
    unit_id: string;
    cost: number;
    price: number;
    size: string;  // เปลี่ยนจาก stock เป็น size
    barcode: string;
}

interface BulkAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: MasterData[];
    units: MasterData[];
    onSaveComplete: () => void;
}

const createEmptyRow = (categories: MasterData[], units: MasterData[], defaultCategoryId?: string, defaultUnitId?: string): BulkProductRow => ({
    id: crypto.randomUUID(),
    name: '',
    category_id: defaultCategoryId || categories[0]?.id || '',
    unit_id: defaultUnitId || units[0]?.id || '',
    cost: 0,
    price: 0,
    size: '',  // เปลี่ยนจาก stock: 0 เป็น size: ''
    barcode: ''
});

export default function BulkAddModal({
    isOpen,
    onClose,
    categories,
    units,
    onSaveComplete
}: BulkAddModalProps) {
    const [rows, setRows] = useState<BulkProductRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [bulkCategoryId, setBulkCategoryId] = useState('');
    const [bulkUnitId, setBulkUnitId] = useState('');
    const toast = useToast();
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // ตั้งค่าหมวดหมู่และหน่วยเริ่มต้น
            const defaultCategoryId = categories[0]?.id || '';
            const defaultUnitId = units[0]?.id || '';
            setBulkCategoryId(defaultCategoryId);
            setBulkUnitId(defaultUnitId);
            // สร้าง 5 แถวเริ่มต้น
            setRows(Array.from({ length: 5 }, () => createEmptyRow(categories, units, defaultCategoryId, defaultUnitId)));
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [isOpen, categories, units]);

    const updateRow = (id: string, field: keyof BulkProductRow, value: any) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addRows = (count: number = 5) => {
        setRows(prev => [...prev, ...Array.from({ length: count }, () => createEmptyRow(categories, units, bulkCategoryId, bulkUnitId))]);
    };

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(row => row.id !== id));
    };

    // ใช้หมวดหมู่เดียวกันกับทุกแถว
    const applyBulkCategory = (categoryId: string) => {
        setBulkCategoryId(categoryId);
        setRows(prev => prev.map(row => ({ ...row, category_id: categoryId })));
    };

    // ใช้หน่วยเดียวกันกับทุกแถว
    const applyBulkUnit = (unitId: string) => {
        setBulkUnitId(unitId);
        setRows(prev => prev.map(row => ({ ...row, unit_id: unitId })));
    };

    const handleSaveAll = async () => {
        const validRows = rows.filter(row => row.name.trim() !== '');
        if (validRows.length === 0) {
            toast.warning('กรุณากรอกชื่อสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const row of validRows) {
                // 1. Insert product
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .insert({
                        name: row.name.trim(),
                        category_id: row.category_id,
                        unit_id: row.unit_id,
                        cost: row.cost,
                        price: row.price,
                        size: row.size.trim() || null,  // เพิ่ม size
                        is_active: true
                    })
                    .select()
                    .single();

                if (productError) {
                    console.error('Error inserting product:', productError);
                    errorCount++;
                    continue;
                }

                const productId = productData.id;

                // 2. Insert inventory with default 0 stock
                await supabase.from('inventory').insert({
                    branch_id: CURRENT_BRANCH_ID,
                    product_id: productId,
                    quantity: 0
                });

                // 3. Insert barcode if provided
                if (row.barcode.trim()) {
                    await supabase.from('product_barcodes').insert({
                        product_id: productId,
                        barcode: row.barcode.trim()
                    });
                }

                successCount++;
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

    const filledRowsCount = rows.filter(row => row.name.trim() !== '').length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="เพิ่มสินค้าหลายรายการ"
            headerColor="bg-green-600"
            size="full"
            closeOnOutsideClick={false}
            footer={
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
                    <div className="text-gray-500 text-sm sm:text-base">
                        กรอกแล้ว <span className="font-bold text-green-600">{filledRowsCount}</span> รายการ
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => addRows(5)}
                            className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-4 sm:px-6 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> เพิ่ม 5 แถว
                        </button>
                        <button
                            onClick={handleSaveAll}
                            disabled={saving || filledRowsCount === 0}
                            className="flex-1 sm:flex-none bg-green-600 text-white px-6 sm:px-8 py-3 rounded-lg font-bold text-base sm:text-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
                        >
                            {saving ? 'กำลังบันทึก...' : (
                                <>
                                    <Save size={20} /> บันทึก ({filledRowsCount})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            {/* Bulk Category & Unit Selector */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                    <Tag size={18} className="text-green-600" />
                    <span className="font-bold text-green-800">ตั้งค่าสำหรับทุกแถว</span>
                    <span className="text-sm text-green-600">(เลือกแล้วจะใช้กับทุกรายการ)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-600 font-medium mb-1 block">หมวดหมู่ทั้งหมด</label>
                        <select
                            value={bulkCategoryId}
                            onChange={(e) => applyBulkCategory(e.target.value)}
                            className="w-full border-2 border-green-300 rounded-lg px-3 py-2.5 bg-white font-medium focus:border-green-500 focus:outline-none"
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 font-medium mb-1 block">หน่วยทั้งหมด</label>
                        <select
                            value={bulkUnitId}
                            onChange={(e) => applyBulkUnit(e.target.value)}
                            className="w-full border-2 border-green-300 rounded-lg px-3 py-2.5 bg-white font-medium focus:border-green-500 focus:outline-none"
                        >
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-50 text-gray-600 text-left border-b sticky top-0">
                        <tr>
                            <th className="p-3 w-10">#</th>
                            <th className="p-3 min-w-[200px]">ชื่อสินค้า *</th>
                            <th className="p-3 w-32">หมวดหมู่</th>
                            <th className="p-3 w-28">หน่วย</th>
                            <th className="p-3 w-28 text-right">ราคาทุน</th>
                            <th className="p-3 w-28 text-right">ราคาขาย</th>
                            <th className="p-3 w-28">ขนาด</th>
                            <th className="p-3 w-36">บาร์โค้ด</th>
                            <th className="p-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id} className="border-b hover:bg-blue-50/50">
                                <td className="p-2 text-gray-400 text-center">{index + 1}</td>
                                <td className="p-2">
                                    <input
                                        ref={index === 0 ? firstInputRef : null}
                                        type="text"
                                        value={row.name}
                                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                                        placeholder="ชื่อสินค้า..."
                                    />
                                </td>
                                <td className="p-2">
                                    <select
                                        value={row.category_id}
                                        onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                                        className="w-full border rounded-lg px-2 py-2 bg-white"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-2">
                                    <select
                                        value={row.unit_id}
                                        onChange={(e) => updateRow(row.id, 'unit_id', e.target.value)}
                                        className="w-full border rounded-lg px-2 py-2 bg-white"
                                    >
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={row.cost || ''}
                                        onChange={(e) => updateRow(row.id, 'cost', Number(e.target.value))}
                                        className="w-full border rounded-lg px-3 py-2 text-right"
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={row.price || ''}
                                        onChange={(e) => updateRow(row.id, 'price', Number(e.target.value))}
                                        className="w-full border rounded-lg px-3 py-2 text-right font-bold text-blue-600"
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="text"
                                        value={row.size}
                                        onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-purple-600 font-medium"
                                        placeholder="50kg, 1L..."
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="text"
                                        value={row.barcode}
                                        onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                                        placeholder="สแกน..."
                                    />
                                </td>
                                <td className="p-2">
                                    <button
                                        onClick={() => removeRow(row.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        title="ลบแถว"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex justify-center gap-2 mt-4 pt-4 border-t">
                <button
                    onClick={() => addRows(1)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    + 1 แถว
                </button>
                <button
                    onClick={() => addRows(5)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    + 5 แถว
                </button>
                <button
                    onClick={() => addRows(10)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    + 10 แถว
                </button>
            </div>
        </Modal>
    );
}

