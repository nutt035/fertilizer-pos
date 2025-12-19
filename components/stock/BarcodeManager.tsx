'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Printer } from 'lucide-react';
import Modal from '../common/Modal';
import Barcode from 'react-barcode';

interface BarcodeManagerProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    barcodes: string[];
    onSave: (barcodes: string[]) => Promise<void>;
}

export default function BarcodeManager({
    isOpen,
    onClose,
    productId,
    productName,
    barcodes: initialBarcodes,
    onSave
}: BarcodeManagerProps) {
    const [barcodes, setBarcodes] = useState<string[]>([]);
    const [newBarcode, setNewBarcode] = useState('');
    const [saving, setSaving] = useState(false);
    const [printBarcode, setPrintBarcode] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setBarcodes(initialBarcodes || []);
            setNewBarcode('');
        }
    }, [isOpen, initialBarcodes]);

    const handleAddBarcode = () => {
        const trimmed = newBarcode.trim();
        if (!trimmed) return;
        if (barcodes.includes(trimmed)) {
            alert('บาร์โค้ดนี้มีอยู่แล้ว');
            return;
        }
        setBarcodes([...barcodes, trimmed]);
        setNewBarcode('');
    };

    const handleRemoveBarcode = (index: number) => {
        setBarcodes(barcodes.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(barcodes);
            onClose();
        } catch (error: any) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = (barcode: string) => {
        setPrintBarcode(barcode);
        setTimeout(() => {
            window.print();
            setPrintBarcode(null);
        }, 100);
    };

    // Generate random barcode (EAN-13 style)
    const generateBarcode = () => {
        const prefix = '200'; // Internal product prefix
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        const code = prefix + random;
        // Calculate check digit for EAN-13
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        setNewBarcode(code + checkDigit);
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`จัดการบาร์โค้ด: ${productName}`}
                headerColor="bg-indigo-500"
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
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-600 disabled:bg-gray-400"
                        >
                            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    {/* Add new barcode */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newBarcode}
                            onChange={e => setNewBarcode(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddBarcode()}
                            placeholder="พิมพ์หรือสแกนบาร์โค้ด..."
                            className="flex-1 border-2 border-gray-200 p-3 rounded-xl text-lg focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={generateBarcode}
                            className="px-4 py-3 bg-yellow-100 text-yellow-700 rounded-xl font-bold hover:bg-yellow-200"
                            title="สร้างบาร์โค้ดอัตโนมัติ"
                        >
                            🎲 สร้าง
                        </button>
                        <button
                            onClick={handleAddBarcode}
                            className="px-4 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {/* Barcode list */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {barcodes.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                ยังไม่มีบาร์โค้ด กรุณาเพิ่มด้านบน
                            </div>
                        ) : (
                            barcodes.map((barcode, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-lg font-bold">{barcode}</span>
                                        {index === 0 && (
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">
                                                หลัก
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePrint(barcode)}
                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                            title="พิมพ์บาร์โค้ด"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveBarcode(index)}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                            title="ลบ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Preview */}
                    {newBarcode && (
                        <div className="bg-gray-50 p-4 rounded-xl text-center">
                            <div className="text-sm text-gray-500 mb-2">ตัวอย่างบาร์โค้ด</div>
                            <Barcode
                                value={newBarcode}
                                format="CODE128"
                                width={2}
                                height={60}
                                displayValue={true}
                                fontSize={14}
                            />
                        </div>
                    )}
                </div>
            </Modal>

            {/* Print only barcode */}
            {printBarcode && (
                <div className="fixed inset-0 bg-white z-[99999] print:block hidden">
                    <div className="flex flex-col items-center justify-start p-4 gap-4">
                        {/* Print multiple copies */}
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="border-b border-dashed pb-4">
                                <div className="text-center font-bold text-sm mb-1">{productName}</div>
                                <Barcode
                                    value={printBarcode}
                                    format="CODE128"
                                    width={1.5}
                                    height={40}
                                    displayValue={true}
                                    fontSize={10}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
