'use client';

import React, { useState, useEffect } from 'react';
import { Scissors, Calculator, Package } from 'lucide-react';
import Modal from '../common/Modal';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { useToast } from '../common/Toast';

interface Product {
    id: string;
    name: string;
    cost: number;
    price: number;
    size?: string;
    unit?: string;
    stock: number;
    remainder_kg?: number; // เศษกิโลที่เหลือจากการแบ่ง
}

interface SplitSellModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onAddToCart: (product: Product, quantity: number, customPrice: number, note: string) => void;
}

export default function SplitSellModal({ isOpen, onClose, products, onAddToCart }: SplitSellModalProps) {
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [weightKg, setWeightKg] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [weightPerBag, setWeightPerBag] = useState(50); // กิโลต่อกระสอบ
    const toast = useToast();

    // Filter only products with "กก" or "กระสอบ" in size/unit
    const splittableProducts = products.filter(p =>
        (p.size && (p.size.includes('กก') || p.size.includes('กระสอบ') || p.size.includes('ก.ก'))) ||
        (p.unit && (p.unit.includes('กก') || p.unit.includes('กระสอบ') || p.unit.includes('ก.ก')))
    );

    const selectedProduct = splittableProducts.find(p => p.id === selectedProductId);

    // Calculations
    const kg = Number(weightKg) || 0;
    const price = Number(sellPrice) || 0;

    // ต้นทุนต่อกิโล = ต้นทุนกระสอบ / น้ำหนักต่อกระสอบ
    const costPerKg = selectedProduct ? selectedProduct.cost / weightPerBag : 0;
    const totalCost = costPerKg * kg;
    const profit = price - totalCost;
    const profitPercent = totalCost > 0 ? ((profit / totalCost) * 100) : 0;

    // Current stock in kg
    const currentStockInKg = selectedProduct
        ? (selectedProduct.stock * weightPerBag) + (selectedProduct.remainder_kg || 0)
        : 0;

    // After sale
    const remainingKg = currentStockInKg - kg;
    const newBags = Math.floor(remainingKg / weightPerBag);
    const newRemainder = remainingKg % weightPerBag;

    useEffect(() => {
        if (isOpen) {
            setSelectedProductId('');
            setWeightKg('');
            setSellPrice('');
        }
    }, [isOpen]);

    const handleAddToCart = async () => {
        if (!selectedProduct || kg <= 0 || price <= 0) {
            toast.error('กรุณากรอกข้อมูลให้ครบ');
            return;
        }

        if (kg > currentStockInKg) {
            toast.error('สต็อกไม่พอ');
            return;
        }

        // Add to cart with custom price
        const note = `แบ่งขาย ${kg} กก.`;
        onAddToCart(selectedProduct, 1, price, note);

        // Update stock in database (deduct from parent)
        // New stock = newBags, remainder = newRemainder
        const { error } = await supabase
            .from('inventory')
            .update({
                quantity: newBags,
                // If you have a remainder field, update it here
            })
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('product_id', selectedProduct.id);

        if (!error) {
            // Record movement
            await supabase.from('inventory_movements').insert({
                branch_id: CURRENT_BRANCH_ID,
                product_id: selectedProduct.id,
                type: 'SPLIT',
                quantity: -kg,
                balance_after: newBags,
                reason: `แบ่งขาย ${kg} กก. ราคา ${price} บาท (เหลือเศษ ${newRemainder} กก.)`,
                ref_type: 'SPLIT_SALE'
            });
        }

        toast.success(`เพิ่ม ${selectedProduct.name} (${kg} กก.) ลงตะกร้าแล้ว`);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🍚 ขายปุ๋ยแบ่งกิโล"
            size="lg"
            headerColor="bg-orange-500"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-lg font-bold text-gray-600 hover:bg-gray-200"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleAddToCart}
                        disabled={!selectedProduct || kg <= 0 || price <= 0 || kg > currentStockInKg}
                        className="px-8 py-3 rounded-xl text-lg font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 flex items-center gap-2"
                    >
                        <Scissors size={20} /> เพิ่มลงตะกร้า
                    </button>
                </>
            }
        >
            <div className="space-y-5">
                {/* Product Select */}
                <div>
                    <label className="block font-bold text-gray-700 mb-2">📦 เลือกสินค้า</label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full border-2 border-gray-200 p-4 rounded-xl text-lg bg-white"
                    >
                        <option value="">-- เลือกสินค้าที่จะแบ่งขาย --</option>
                        {splittableProducts.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} {p.size && `(${p.size})`} - คงเหลือ {p.stock} กระสอบ
                            </option>
                        ))}
                    </select>
                </div>

                {selectedProduct && (
                    <>
                        {/* Weight Per Bag */}
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">⚖️ น้ำหนักต่อกระสอบ (กก.)</label>
                            <input
                                type="number"
                                value={weightPerBag}
                                onChange={(e) => setWeightPerBag(Number(e.target.value))}
                                className="w-full border-2 border-gray-200 p-4 rounded-xl text-lg"
                                placeholder="50"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                ต้นทุน: {selectedProduct.cost.toLocaleString()} บาท/กระสอบ = <span className="font-bold text-blue-600">{costPerKg.toFixed(2)} บาท/กก.</span>
                            </p>
                        </div>

                        {/* Current Stock Info */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <p className="font-bold text-blue-700">
                                📊 สต็อกปัจจุบัน: {selectedProduct.stock} กระสอบ
                                {selectedProduct.remainder_kg ? ` + ${selectedProduct.remainder_kg} กก.` : ''}
                                <span className="text-gray-500 ml-2">
                                    (รวม {currentStockInKg.toLocaleString()} กก.)
                                </span>
                            </p>
                        </div>

                        {/* Weight to Sell */}
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">🔢 จำนวนที่ขาย (กก.)</label>
                            <input
                                type="number"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                className="w-full border-2 border-orange-300 p-4 rounded-xl text-2xl font-bold text-center bg-orange-50"
                                placeholder="0"
                            />
                        </div>

                        {/* Sell Price */}
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">💰 ราคาขาย (บาท)</label>
                            <input
                                type="number"
                                value={sellPrice}
                                onChange={(e) => setSellPrice(e.target.value)}
                                className="w-full border-2 border-green-300 p-4 rounded-xl text-2xl font-bold text-center bg-green-50"
                                placeholder="0"
                            />
                        </div>

                        {/* Calculations */}
                        {kg > 0 && price > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">ต้นทุน {kg} กก.</p>
                                        <p className="text-xl font-bold text-gray-700">{totalCost.toFixed(2)} บาท</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">กำไร</p>
                                        <p className={`text-2xl font-black ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {profit >= 0 ? '+' : ''}{profit.toFixed(2)} บาท
                                        </p>
                                        <p className="text-xs text-gray-400">({profitPercent.toFixed(1)}%)</p>
                                    </div>
                                </div>

                                <div className="border-t border-green-200 pt-3">
                                    <p className="text-sm text-gray-500">🔄 หลังขายจะเหลือ:</p>
                                    <p className="text-lg font-bold text-orange-700">
                                        {newBags} กระสอบ + {newRemainder.toFixed(1)} กก.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {splittableProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p>ไม่พบสินค้าที่แบ่งขายได้</p>
                        <p className="text-sm mt-2">สินค้าต้องมีขนาดเป็น "กก." หรือ "กระสอบ"</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
