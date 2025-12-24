'use client';

import React, { useState, useEffect } from 'react';
import { Scissors } from 'lucide-react';
import Modal from '../common/Modal';
import { SplitRecipe, StockProduct } from '../../types';
import { useToast } from '../common/Toast';

interface SplitModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: StockProduct[];
    recipes: SplitRecipe[];
    onExecute: (parentProductId: string, quantity: number) => Promise<void>;
}

export default function SplitModal({
    isOpen,
    onClose,
    products,
    recipes,
    onExecute
}: SplitModalProps) {
    const [parentProductId, setParentProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [splitting, setSplitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setParentProductId('');
            setQuantity(1);
        }
    }, [isOpen]);

    const productsWithRecipes = products.filter(p =>
        recipes.some(r => r.parent_product_id === p.id)
    );

    const relatedRecipes = recipes.filter(r => r.parent_product_id === parentProductId);

    const handleExecute = async () => {
        if (!parentProductId) {
            toast.warning('กรุณาเลือกสินค้าแม่');
            return;
        }
        if (quantity <= 0) {
            toast.warning('จำนวนต้องมากกว่า 0');
            return;
        }
        setSplitting(true);
        try {
            await onExecute(parentProductId, quantity);
            onClose();
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSplitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="ตัดแบ่งของขาย"
            titleIcon={<Scissors />}
            headerColor="bg-orange-500"
            size="lg"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-lg text-gray-600 hover:bg-gray-200"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleExecute}
                        disabled={splitting || !parentProductId}
                        className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-orange-600 disabled:bg-gray-400"
                    >
                        {splitting ? 'กำลังดำเนินการ...' : 'ยืนยันตัดแบ่ง'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* เลือกสินค้าแม่ */}
                <div>
                    <label className="block text-gray-700 mb-2 font-bold">เลือกสินค้าแม่ที่จะแบ่ง</label>
                    <select
                        value={parentProductId}
                        onChange={e => setParentProductId(e.target.value)}
                        className="w-full border-2 p-3 rounded-lg text-lg bg-white"
                    >
                        <option value="">-- เลือกสินค้า --</option>
                        {productsWithRecipes.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.sku ? `[${p.sku}] ` : ''}{p.name} (คงเหลือ: {p.stock})
                            </option>
                        ))}
                    </select>
                    {productsWithRecipes.length === 0 && (
                        <div className="text-red-500 text-sm mt-2">
                            ⚠️ ยังไม่มีสินค้าที่ตั้งค่าสูตรไว้ กรุณาตั้งค่าสูตรก่อน
                        </div>
                    )}
                </div>

                {/* จำนวนที่จะแบ่ง */}
                <div>
                    <label className="block text-gray-700 mb-2 font-bold">จำนวนแม่ที่จะแบ่ง</label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full text-center text-3xl font-bold border-2 border-orange-200 rounded-xl p-4 focus:border-orange-500 outline-none"
                    />
                </div>

                {/* Preview */}
                {parentProductId && (
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                        <div className="text-sm text-orange-700 font-bold mb-2">📦 จะได้รับสินค้าลูก:</div>
                        {relatedRecipes.map(recipe => {
                            const childProduct = products.find(p => p.id === recipe.child_product_id);
                            const addQty = quantity * recipe.quantity_per_parent;
                            return (
                                <div key={recipe.id} className="flex justify-between items-center py-2 border-b border-orange-100 last:border-0">
                                    <span>{childProduct?.sku ? `[${childProduct.sku}] ` : ''}{childProduct?.name || 'Unknown'}</span>
                                    <span className="text-green-600 font-bold text-xl">+{addQty}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
