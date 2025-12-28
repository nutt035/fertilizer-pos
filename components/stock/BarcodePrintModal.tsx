'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X, Check, Search } from 'lucide-react';
import Modal from '../common/Modal';

interface BarcodeProduct {
    id: string;
    name: string;
    size?: string;
    price: number;
    barcode: string;
}

interface BarcodePrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: BarcodeProduct[];
}

export default function BarcodePrintModal({
    isOpen,
    onClose,
    products
}: BarcodePrintModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);

    // Filter products that have barcode
    const productsWithBarcode = products.filter(p => p.barcode && p.barcode.trim() !== '');

    // Search filter
    const filteredProducts = productsWithBarcode.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
    );

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setSearchTerm('');
        }
    }, [isOpen]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    const handlePrint = () => {
        setIsPrinting(true);
        // ให้เวลา render print view ก่อน
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    const selectedProducts = productsWithBarcode.filter(p => selectedIds.has(p.id));

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="ปริ้นบาร์โค้ด"
                headerColor="bg-indigo-600"
                size="full"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="text-gray-500">
                            เลือกแล้ว <span className="font-bold text-indigo-600">{selectedIds.size}</span> รายการ
                            <span className="text-gray-400 ml-2">
                                (มีบาร์โค้ดทั้งหมด {productsWithBarcode.length} รายการ)
                            </span>
                        </div>
                        <button
                            onClick={handlePrint}
                            disabled={selectedIds.size === 0}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 flex items-center gap-2 disabled:bg-gray-400"
                        >
                            <Printer size={24} /> ปริ้น ({selectedIds.size})
                        </button>
                    </div>
                }
            >
                {/* Search & Actions */}
                <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาชื่อหรือบาร์โค้ด..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={selectAll}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200"
                    >
                        เลือกทั้งหมด
                    </button>
                    <button
                        onClick={deselectAll}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200"
                    >
                        ยกเลิกทั้งหมด
                    </button>
                </div>

                {/* Product List */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Printer size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">ไม่มีสินค้าที่มีบาร์โค้ด</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => toggleSelect(product.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition ${selectedIds.has(product.id)
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedIds.has(product.id)
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-gray-300'
                                        }`}>
                                        {selectedIds.has(product.id) && <Check size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-800 truncate">
                                            {product.name}
                                            {product.size && (
                                                <span className="ml-1 text-purple-600 font-normal">({product.size})</span>
                                            )}
                                        </div>
                                        <div className="text-lg font-bold text-red-500">฿{product.price.toLocaleString()}</div>
                                        <div className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                                            {product.barcode}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* Print View - Hidden until print */}
            {isPrinting && (
                <div className="barcode-print-container">
                    {selectedProducts.map((product, index) => (
                        <div key={product.id} className="barcode-label">
                            <div className="barcode-name">
                                {product.name}
                                {product.size && <span className="barcode-size">({product.size})</span>}
                            </div>
                            <div className="barcode-price">฿{product.price.toLocaleString()}.-</div>
                            <div className="barcode-code">{product.barcode}</div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx global>{`
                @media print {
                    /* Hide everything except barcode print container */
                    body * {
                        visibility: hidden;
                    }
                    .barcode-print-container,
                    .barcode-print-container * {
                        visibility: visible;
                    }
                    .barcode-print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                    }
                }

                .barcode-print-container {
                    width: 80mm;
                    font-family: 'Arial', sans-serif;
                }

                .barcode-label {
                    width: 80mm;
                    padding: 3mm;
                    border-bottom: 1px dashed #ccc;
                    page-break-inside: avoid;
                    text-align: center;
                }

                .barcode-name {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 2px;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .barcode-size {
                    font-weight: normal;
                    color: #666;
                    margin-left: 4px;
                }

                .barcode-price {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 4px 0;
                }

                .barcode-code {
                    font-family: 'Courier New', monospace;
                    font-size: 16px;
                    letter-spacing: 2px;
                    padding: 4px 8px;
                    background: #f0f0f0;
                    display: inline-block;
                    margin-top: 4px;
                }
            `}</style>
        </>
    );
}
