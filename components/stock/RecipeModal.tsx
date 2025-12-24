'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import Modal from '../common/Modal';
import { SplitRecipe, StockProduct } from '../../types';
import { useToast } from '../common/Toast';

interface RecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: StockProduct[];
    recipes: SplitRecipe[];
    onSave: (parentProductId: string, childProductId: string, quantityPerParent: number) => Promise<void>;
}

export default function RecipeModal({
    isOpen,
    onClose,
    products,
    recipes,
    onSave
}: RecipeModalProps) {
    const [parentProductId, setParentProductId] = useState('');
    const [childProductId, setChildProductId] = useState('');
    const [quantityPerParent, setQuantityPerParent] = useState(1);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setParentProductId('');
            setChildProductId('');
            setQuantityPerParent(1);
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!parentProductId || !childProductId) {
            toast.warning('กรุณาเลือกสินค้าแม่และลูก');
            return;
        }
        if (parentProductId === childProductId) {
            toast.warning('สินค้าแม่และลูกต้องไม่เหมือนกัน');
            return;
        }
        if (quantityPerParent <= 0) {
            toast.warning('จำนวนต่อ 1 แม่ต้องมากกว่า 0');
            return;
        }
        setSaving(true);
        try {
            await onSave(parentProductId, childProductId, quantityPerParent);
            setParentProductId('');
            setChildProductId('');
            setQuantityPerParent(1);
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="ตั้งค่าสูตรการแบ่ง"
            titleIcon={<Settings />}
            headerColor="bg-purple-500"
            size="xl"
            footer={
                <button
                    onClick={onClose}
                    className="bg-gray-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-gray-700"
                >
                    ปิด
                </button>
            }
        >
            <div className="space-y-4">
                {/* Form เพิ่มสูตรใหม่ */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                    <div className="text-purple-700 font-bold mb-3">➕ เพิ่มสูตรใหม่</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-gray-600 text-sm mb-1">สินค้าแม่ (ต้นทาง)</label>
                            <select
                                value={parentProductId}
                                onChange={e => setParentProductId(e.target.value)}
                                className="w-full border p-2 rounded-lg text-sm bg-white"
                            >
                                <option value="">-- เลือก --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.sku ? `[${p.sku}] ` : ''}{p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-600 text-sm mb-1">สินค้าลูก (ปลายทาง)</label>
                            <select
                                value={childProductId}
                                onChange={e => setChildProductId(e.target.value)}
                                className="w-full border p-2 rounded-lg text-sm bg-white"
                            >
                                <option value="">-- เลือก --</option>
                                {products.filter(p => p.id !== parentProductId).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.sku ? `[${p.sku}] ` : ''}{p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-600 text-sm mb-1">จำนวนลูกต่อ 1 แม่</label>
                            <input
                                type="number"
                                min="1"
                                value={quantityPerParent}
                                onChange={e => setQuantityPerParent(Number(e.target.value))}
                                className="w-full border p-2 rounded-lg text-sm"
                                placeholder="เช่น 50"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-600 disabled:bg-gray-400"
                        >
                            <Save size={16} className="inline mr-1" />
                            {saving ? 'กำลังบันทึก...' : 'บันทึกสูตร'}
                        </button>
                    </div>
                </div>

                {/* รายการสูตรปัจจุบัน */}
                <div>
                    <div className="text-gray-700 font-bold mb-3">📋 สูตรที่มีอยู่ ({recipes.length} รายการ)</div>
                    {recipes.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            ยังไม่มีสูตร กรุณาเพิ่มสูตรด้านบน
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recipes.map(recipe => (
                                <div key={recipe.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold">
                                            {recipe.parent_product?.sku || 'N/A'}
                                        </span>
                                        <span className="text-gray-800">{recipe.parent_product?.name}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">
                                            {recipe.child_product?.sku || 'N/A'}
                                        </span>
                                        <span className="text-gray-800">{recipe.child_product?.name}</span>
                                    </div>
                                    <div className="text-purple-600 font-bold">x{recipe.quantity_per_parent}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
