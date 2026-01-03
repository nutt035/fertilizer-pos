'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, Check, Search, Download, FileSpreadsheet } from 'lucide-react';
import Barcode from 'react-barcode';

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
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const printRef = useRef<HTMLDivElement>(null);

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
            setQuantities({});
            // Lock body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // Remove qty when deselected
                setQuantities(prev => {
                    const newQty = { ...prev };
                    delete newQty[id];
                    return newQty;
                });
            } else {
                next.add(id);
                // Set default qty to 1
                setQuantities(prev => ({ ...prev, [id]: 1 }));
            }
            return next;
        });
    };

    const selectAll = () => {
        const newIds = new Set(filteredProducts.map(p => p.id));
        setSelectedIds(newIds);
        // Set qty 1 for all
        const newQty: Record<string, number> = {};
        filteredProducts.forEach(p => newQty[p.id] = 1);
        setQuantities(newQty);
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
        setQuantities({});
    };

    const updateQuantity = (id: string, qty: number) => {
        if (qty < 1) qty = 1;
        if (qty > 999) qty = 999;
        setQuantities(prev => ({ ...prev, [id]: qty }));
    };

    // ✅ Export CSV for OpenLabel+
    const handleExportCSV = () => {
        const selectedProducts = productsWithBarcode.filter(p => selectedIds.has(p.id));
        if (selectedProducts.length === 0) return;

        // CSV Header - columns for OpenLabel+
        const headers = ['ProductName', 'Size', 'Price', 'Barcode', 'Qty'];

        // CSV Rows - repeat each product by its quantity
        const rows: string[][] = [];
        selectedProducts.forEach(product => {
            const qty = quantities[product.id] || 1;
            for (let i = 0; i < qty; i++) {
                rows.push([
                    `"${product.name.replace(/"/g, '""')}"`, // Escape quotes
                    `"${(product.size || '').replace(/"/g, '""')}"`,
                    product.price.toString(),
                    product.barcode,
                    '1' // Each row = 1 label
                ]);
            }
        });

        // Create CSV content with BOM for Excel/Thai support
        const BOM = '\uFEFF';
        const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode_openlabel_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        if (!printRef.current) return;

        const printContent = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // CSS สำหรับสติ๊กเกอร์ม้วน GAP ขนาด 32mm x 25mm แบบ 3 แถว (3 columns)
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>พิมพ์บาร์โค้ด</title>
                <style>
                    @page {
                        size: 96mm 25mm;
                        margin: 0;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Arial', 'Helvetica', sans-serif;
                        margin: 0;
                        padding: 0;
                        width: 96mm;
                    }
                    .label-row {
                        width: 96mm;
                        height: 25mm;
                        display: flex;
                        flex-direction: row;
                        page-break-after: always;
                        break-after: page;
                    }
                    .label-row:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                    .label {
                        width: 32mm;
                        height: 25mm;
                        box-sizing: border-box;
                        padding: 1mm;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        overflow: hidden;
                    }
                    .label-name {
                        font-size: 2mm;
                        font-weight: bold;
                        line-height: 1.1;
                        max-height: 2.5mm;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        width: 100%;
                        margin-bottom: 0.5mm;
                    }
                    .label-price {
                        font-size: 3mm;
                        font-weight: bold;
                        margin-bottom: 0.5mm;
                    }
                    .label-barcode {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        flex: 1;
                        width: 100%;
                        max-height: 18mm;
                    }
                    .label-barcode svg {
                        width: 28mm !important;
                        max-width: 30mm !important;
                        height: 10mm !important;
                        max-height: 12mm !important;
                    }
                    /* ลดขนาด font ตัวเลขใต้บาร์โค้ด */
                    .label-barcode svg text {
                        font-size: 6pt !important;
                    }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);

        printWindow.document.close();

        // รอให้ barcode render เสร็จ (เพิ่มเวลาเพื่อความเสถียร)
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 800);
        };

        // Fallback กรณี onload ไม่ทำงาน
        setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }
        }, 1500);
    };

    const selectedProducts = productsWithBarcode.filter(p => selectedIds.has(p.id));
    const totalLabels = selectedProducts.reduce((sum, p) => sum + (quantities[p.id] || 1), 0);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 lg:inset-10 bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Printer size={24} /> ปริ้นบาร์โค้ด
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-4 bg-gray-50 border-b shrink-0">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 relative min-w-[200px]">
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
                </div>

                {/* Product List - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Printer size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">ไม่มีสินค้าที่มีบาร์โค้ด</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`p-4 rounded-xl border-2 transition ${selectedIds.has(product.id)
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            onClick={() => toggleSelect(product.id)}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer ${selectedIds.has(product.id)
                                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                                : 'border-gray-300 hover:border-indigo-400'
                                                }`}>
                                            {selectedIds.has(product.id) && <Check size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0" onClick={() => toggleSelect(product.id)}>
                                            <div className="font-bold text-gray-800 truncate cursor-pointer">
                                                {product.name}
                                                {product.size && (
                                                    <span className="ml-1 text-purple-600 font-normal">({product.size})</span>
                                                )}
                                            </div>
                                            <div className="text-lg font-bold text-red-500">฿{product.price.toLocaleString()}</div>
                                            <div className="mt-2 flex justify-center bg-white p-2 rounded-lg border">
                                                <Barcode
                                                    value={product.barcode}
                                                    width={1.5}
                                                    height={40}
                                                    fontSize={12}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity Input - Show when selected */}
                                    {selectedIds.has(product.id) && (
                                        <div className="mt-3 flex items-center justify-center gap-2 bg-indigo-100 rounded-lg p-2">
                                            <span className="text-sm font-medium text-indigo-700">จำนวน:</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, (quantities[product.id] || 1) - 1); }}
                                                className="w-8 h-8 bg-white rounded-lg font-bold text-indigo-600 hover:bg-indigo-200 border border-indigo-300"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                value={quantities[product.id] || 1}
                                                onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-16 text-center py-1 rounded-lg border border-indigo-300 font-bold text-indigo-700"
                                                min={1}
                                                max={999}
                                            />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, (quantities[product.id] || 1) + 1); }}
                                                className="w-8 h-8 bg-white rounded-lg font-bold text-indigo-600 hover:bg-indigo-200 border border-indigo-300"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t shrink-0">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="text-gray-500">
                            เลือกแล้ว <span className="font-bold text-indigo-600">{selectedIds.size}</span> รายการ
                            {selectedIds.size > 0 && (
                                <span className="ml-2 text-indigo-600 font-bold">
                                    ({totalLabels} ป้าย)
                                </span>
                            )}
                            <span className="text-gray-400 ml-2">
                                (มีบาร์โค้ดทั้งหมด {productsWithBarcode.length} รายการ)
                            </span>
                        </div>
                        <div className="flex gap-3">
                            {/* Export CSV Button */}
                            <button
                                onClick={handleExportCSV}
                                disabled={selectedIds.size === 0}
                                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400"
                                title="Export CSV สำหรับ OpenLabel+"
                            >
                                <FileSpreadsheet size={20} />
                                <span className="hidden md:inline">Export CSV</span>
                                <span className="md:hidden">CSV</span>
                            </button>

                            {/* Print Button */}
                            <button
                                onClick={handlePrint}
                                disabled={selectedIds.size === 0}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 flex items-center gap-2 disabled:bg-gray-400"
                            >
                                <Printer size={24} /> ปริ้น ({totalLabels})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Print Content - 32mm x 25mm GAP Label (3 columns) */}
            <div ref={printRef} className="hidden">
                {/* Generate labels with quantities */}
                {(() => {
                    // Expand products by their quantities
                    const allLabels: BarcodeProduct[] = [];
                    selectedProducts.forEach(product => {
                        const qty = quantities[product.id] || 1;
                        for (let i = 0; i < qty; i++) {
                            allLabels.push(product);
                        }
                    });

                    // Group into rows of 3
                    return Array.from({ length: Math.ceil(allLabels.length / 3) }, (_, rowIndex) => (
                        <div key={rowIndex} className="label-row">
                            {allLabels.slice(rowIndex * 3, rowIndex * 3 + 3).map((product, idx) => (
                                <div key={`${product.id}-${rowIndex}-${idx}`} className="label">
                                    <div className="label-name">
                                        {product.name}{product.size ? ` (${product.size})` : ''}
                                    </div>
                                    <div className="label-price">฿{product.price.toLocaleString()}</div>
                                    <div className="label-barcode">
                                        <Barcode
                                            value={product.barcode}
                                            width={1}
                                            height={30}
                                            fontSize={8}
                                            margin={0}
                                            displayValue={true}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ));
                })()}
            </div>
        </>
    );
}

