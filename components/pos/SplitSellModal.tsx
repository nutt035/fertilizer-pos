'use client';

import React, { useState, useEffect } from 'react';
import { Scissors, Package, ArrowLeft, Scale, Banknote, Check, X } from 'lucide-react';
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
    image_url?: string;
    remainder_kg?: number;
}

interface SplitSellModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onAddToCart: (product: Product, quantity: number, customPrice: number, note: string) => void;
}

export default function SplitSellModal({ isOpen, onClose, products, onAddToCart }: SplitSellModalProps) {
    const [step, setStep] = useState<'select' | 'weight' | 'price'>('select');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [weightKg, setWeightKg] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [weightPerBag, setWeightPerBag] = useState(50);
    const toast = useToast();

    // Filter only products with "กก" or "กระสอบ" in size/unit
    const splittableProducts = products.filter(p =>
        (p.size && (p.size.includes('กก') || p.size.includes('กระสอบ') || p.size.includes('ก.ก'))) ||
        (p.unit && (p.unit.includes('กก') || p.unit.includes('กระสอบ') || p.unit.includes('ก.ก')))
    );

    // Calculations
    const kg = Number(weightKg) || 0;
    const price = Number(sellPrice) || 0;
    const costPerKg = selectedProduct ? selectedProduct.cost / weightPerBag : 0;
    const totalCost = costPerKg * kg;
    const profit = price - totalCost;

    const currentStockInKg = selectedProduct
        ? (selectedProduct.stock * weightPerBag) + (selectedProduct.remainder_kg || 0)
        : 0;

    const remainingKg = currentStockInKg - kg;
    const newBags = Math.floor(remainingKg / weightPerBag);
    const newRemainder = remainingKg % weightPerBag;

    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setSelectedProduct(null);
            setWeightKg('');
            setSellPrice('');
        }
    }, [isOpen]);

    // ปุ่มตัวเลขสำหรับกด
    const handleNumPad = (num: string, target: 'weight' | 'price') => {
        const setter = target === 'weight' ? setWeightKg : setSellPrice;
        const current = target === 'weight' ? weightKg : sellPrice;

        if (num === 'C') {
            setter('');
        } else if (num === '⌫') {
            setter(current.slice(0, -1));
        } else if (num === '.') {
            if (!current.includes('.')) {
                setter(current + num);
            }
        } else {
            setter(current + num);
        }
    };

    // ปุ่มลัดน้ำหนัก
    const quickWeights = [1, 2, 3, 5, 10, 15, 20, 25, 30];

    // ปุ่มลัดราคา (คำนวณจากต้นทุน + กำไร)
    const getQuickPrices = () => {
        if (!selectedProduct || kg <= 0) return [];
        const baseCost = totalCost;
        // ราคาแนะนำ: บวก 10%, 20%, 30%, 50%
        return [
            { label: '+10%', value: Math.ceil(baseCost * 1.1) },
            { label: '+20%', value: Math.ceil(baseCost * 1.2) },
            { label: '+30%', value: Math.ceil(baseCost * 1.3) },
            { label: '+50%', value: Math.ceil(baseCost * 1.5) },
        ];
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setStep('weight');
    };

    const handleConfirmWeight = () => {
        if (kg <= 0) {
            toast.warning('กรุณาใส่จำนวนกิโล');
            return;
        }
        if (kg > currentStockInKg) {
            toast.error('สต็อกไม่พอ!');
            return;
        }
        setStep('price');
    };

    const handleAddToCart = async () => {
        if (!selectedProduct || kg <= 0 || price <= 0) {
            toast.error('กรุณากรอกข้อมูลให้ครบ');
            return;
        }

        // Add to cart with custom price
        const note = `แบ่งขาย ${kg} กก.`;
        onAddToCart(selectedProduct, 1, price, note);

        // Update stock in database
        const { error } = await supabase
            .from('inventory')
            .update({ quantity: newBags })
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('product_id', selectedProduct.id);

        if (!error) {
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

    // NumPad Component
    const NumPad = ({ target }: { target: 'weight' | 'price' }) => (
        <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map(num => (
                <button
                    key={num}
                    onClick={() => handleNumPad(num, target)}
                    className={`py-4 text-3xl font-bold rounded-xl transition-all active:scale-95 ${num === '⌫'
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                >
                    {num}
                </button>
            ))}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                step === 'select' ? '🍚 เลือกสินค้าที่จะแบ่ง' :
                    step === 'weight' ? '⚖️ ใส่น้ำหนัก (กก.)' :
                        '💰 ใส่ราคาขาย'
            }
            size="xl"
            headerColor="bg-orange-500"
            footer={
                step === 'select' ? (
                    <button
                        onClick={onClose}
                        className="px-8 py-4 rounded-xl text-xl font-bold text-gray-600 hover:bg-gray-200"
                    >
                        ปิด
                    </button>
                ) : step === 'weight' ? (
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setStep('select')}
                            className="flex-1 py-4 rounded-xl text-xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={24} /> กลับ
                        </button>
                        <button
                            onClick={handleConfirmWeight}
                            disabled={kg <= 0 || kg > currentStockInKg}
                            className="flex-1 py-4 rounded-xl text-xl font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            <Check size={24} /> ถัดไป
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setStep('weight')}
                            className="flex-1 py-4 rounded-xl text-xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={24} /> กลับ
                        </button>
                        <button
                            onClick={handleAddToCart}
                            disabled={price <= 0}
                            className="flex-1 py-4 rounded-xl text-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            <Check size={24} /> เพิ่มลงตะกร้า
                        </button>
                    </div>
                )
            }
        >
            {/* Step 1: Select Product - Visual Cards */}
            {step === 'select' && (
                <div className="space-y-4">
                    {splittableProducts.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Package size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-xl">ไม่พบสินค้าที่แบ่งขายได้</p>
                            <p className="text-base mt-2">สินค้าต้องมีขนาดเป็น "กก." หรือ "กระสอบ"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                            {splittableProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => handleSelectProduct(product)}
                                    className="bg-white border-2 border-gray-200 rounded-2xl p-3 hover:border-orange-400 hover:shadow-lg transition-all active:scale-95 text-left"
                                >
                                    {/* Product Image */}
                                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 mb-3 flex items-center justify-center overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Package size={48} className="text-orange-300" />
                                        )}
                                    </div>

                                    {/* Product Name */}
                                    <h3 className="font-bold text-lg text-gray-800 line-clamp-2 mb-1">
                                        {product.name}
                                    </h3>

                                    {/* Size & Stock */}
                                    <p className="text-sm text-gray-500 mb-2">
                                        {product.size || '-'}
                                    </p>

                                    <div className="flex justify-between items-center">
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                            {product.stock} กระสอบ
                                        </span>
                                        <span className="text-orange-600 font-bold">
                                            ฿{product.price?.toLocaleString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Enter Weight */}
            {step === 'weight' && selectedProduct && (
                <div className="space-y-4">
                    {/* Selected Product Preview */}
                    <div className="flex items-center gap-4 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                        <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                            {selectedProduct.image_url ? (
                                <img
                                    src={selectedProduct.image_url}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Package size={32} className="text-orange-300" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl text-gray-800 truncate">{selectedProduct.name}</h3>
                            <p className="text-orange-600">
                                สต็อก: <span className="font-bold">{currentStockInKg.toLocaleString()} กก.</span>
                            </p>
                            <p className="text-sm text-gray-500">ต้นทุน: ฿{costPerKg.toFixed(2)}/กก.</p>
                        </div>
                    </div>

                    {/* Weight Display */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <Scale size={32} className="text-blue-500" />
                            <span className="text-6xl font-black text-blue-700">
                                {weightKg || '0'}
                            </span>
                            <span className="text-3xl text-blue-400 font-bold">กก.</span>
                        </div>
                        {kg > currentStockInKg && (
                            <p className="text-red-600 font-bold mt-2">⚠️ เกินสต็อกที่มี!</p>
                        )}
                    </div>

                    {/* Quick Weight Buttons */}
                    <div className="grid grid-cols-5 gap-2">
                        {quickWeights.map(w => (
                            <button
                                key={w}
                                onClick={() => setWeightKg(w.toString())}
                                disabled={w > currentStockInKg}
                                className={`py-3 rounded-xl text-xl font-bold transition-all active:scale-95 ${weightKg === w.toString()
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {w}
                            </button>
                        ))}
                        <button
                            onClick={() => setWeightKg('')}
                            className="py-3 rounded-xl text-xl font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                        >
                            C
                        </button>
                    </div>

                    {/* NumPad */}
                    <NumPad target="weight" />
                </div>
            )}

            {/* Step 3: Enter Price */}
            {step === 'price' && selectedProduct && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center gap-4 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                        <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                            {selectedProduct.image_url ? (
                                <img
                                    src={selectedProduct.image_url}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Package size={24} className="text-orange-300" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800">{selectedProduct.name}</h3>
                            <p className="text-orange-600 font-bold text-xl">แบ่ง {kg} กก.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">ต้นทุน</p>
                            <p className="text-xl font-bold text-gray-700">฿{totalCost.toFixed(0)}</p>
                        </div>
                    </div>

                    {/* Price Display */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <Banknote size={32} className="text-green-500" />
                            <span className="text-6xl font-black text-green-700">
                                {sellPrice || '0'}
                            </span>
                            <span className="text-3xl text-green-400 font-bold">บาท</span>
                        </div>
                        {price > 0 && (
                            <p className={`font-bold mt-2 text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                กำไร: {profit >= 0 ? '+' : ''}{profit.toFixed(0)} บาท
                            </p>
                        )}
                    </div>

                    {/* Quick Price Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {getQuickPrices().map(qp => (
                            <button
                                key={qp.label}
                                onClick={() => setSellPrice(qp.value.toString())}
                                className={`py-3 rounded-xl text-lg font-bold transition-all active:scale-95 ${sellPrice === qp.value.toString()
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                            >
                                <div>{qp.label}</div>
                                <div className="text-sm">฿{qp.value}</div>
                            </button>
                        ))}
                    </div>

                    {/* NumPad */}
                    <NumPad target="price" />
                </div>
            )}
        </Modal>
    );
}
