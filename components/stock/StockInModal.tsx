'use client';

import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';

interface StockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
    onSave: (quantity: number) => Promise<void>;
}

export default function StockInModal({
    isOpen,
    onClose,
    product,
    onSave
}: StockInModalProps) {
    const [quantity, setQuantity] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setQuantity('');
        }
    }, [isOpen]);

    const handleSave = async () => {
        const qty = Number(quantity);
        if (qty <= 0) {
            toast.warning('กรุณาใส่จำนวนที่ต้องการเติม');
            return;
        }
        setSaving(true);
        try {
            await onSave(qty);
            onClose();
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
            title="รับสินค้าเข้า"
            titleIcon={<Package />}
            headerColor="bg-green-100 !text-green-800"
            size="md"
            footer={
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                    {saving ? 'กำลังบันทึก...' : 'ยืนยันรับของ'}
                </button>
            }
        >
            <div className="mb-4 text-center">
                <div className="text-gray-500">สินค้า</div>
                <div className="text-xl font-bold">{product?.name}</div>
                <div className="text-sm text-gray-400">
                    คงเหลือปัจจุบัน: {product?.stock} {product?.unit}
                </div>
            </div>
            <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-bold">จำนวนที่รับเข้า (+)</label>
                <input
                    type="number"
                    className="w-full text-center text-4xl font-bold border-2 border-green-200 rounded-xl p-4 focus:border-green-500 outline-none"
                    autoFocus
                    placeholder="0"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                />
            </div>
        </Modal>
    );
}
