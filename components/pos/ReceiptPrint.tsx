'use client';

import React from 'react';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    unit?: string;
}

/**
 * ข้อมูลใบเสร็จ - แก้ไขได้ที่ Settings > ข้อมูลร้าน & สาขา
 * 
 * shopName = ชื่อร้าน/สาขา
 * shopAddress = ที่อยู่
 * shopPhone = เบอร์โทร
 * shopTaxId = เลขผู้เสียภาษี
 * receiptHeader = ข้อความใต้ชื่อร้าน
 * receiptFooter = ข้อความด้านล่างใบเสร็จ
 */
interface ReceiptData {
    receiptNo?: string;
    date: string;
    time: string;
    customerName?: string;
    items: ReceiptItem[];
    totalAmount: number;
    paymentMethod: 'cash' | 'transfer';
    cashReceived?: number;
    changeAmount?: number;
    // ข้อมูลร้าน (แก้ไขได้ที่ Settings > ข้อมูลร้าน & สาขา)
    shopName?: string;
    shopAddress?: string;
    shopPhone?: string;
    shopTaxId?: string;
    receiptHeader?: string;  // ข้อความใต้ชื่อร้าน
    receiptFooter?: string;  // ข้อความด้านล่างใบเสร็จ
}

interface ReceiptPrintProps {
    data: ReceiptData;
    isPreview?: boolean;
}

export default function ReceiptPrint({ data, isPreview = false }: ReceiptPrintProps) {
    const {
        receiptNo,
        date,
        time,
        customerName,
        items,
        totalAmount,
        paymentMethod,
        cashReceived,
        changeAmount,
        shopName = 'ร้านค้า',
        shopAddress,
        shopPhone,
        shopTaxId,
        receiptHeader,
        receiptFooter = 'ขอบคุณที่อุดหนุน'
    } = data;

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div
            id={isPreview ? "receipt-preview" : "printable-receipt"}
            className={isPreview ? "bg-white p-4 shadow-sm" : "print-only"}
            style={isPreview ? {} : { display: 'none' }}
        >
            {/* ===== HEADER ร้าน ===== */}
            <div className="receipt-header">
                <div style={{ fontSize: '48px', fontWeight: 'bold' }}>ใบเสร็จรับเงิน</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{shopName}</div>
                {shopAddress && <div style={{ fontSize: '24px' }}>{shopAddress}</div>}
                {shopPhone && <div style={{ fontSize: '24px' }}>โทร: {shopPhone}</div>}
                {shopTaxId && <div style={{ fontSize: '24px' }}>เลขประจำตัวผู้เสียภาษี: {shopTaxId}</div>}
            </div>

            <hr className="receipt-divider" />

            {/* ===== ข้อมูลบิล ===== */}
            <div style={{ fontSize: '24px', marginBottom: '2mm' }}>
                {receiptNo && (
                    <div className="receipt-row">
                        <span>เลขที่ใบเสร็จ:</span>
                        <span className="receipt-item-price">{receiptNo}</span>
                    </div>
                )}
                <div className="receipt-row">
                    <span>วันที่:</span>
                    <span className="receipt-item-price">{date}</span>
                </div>
                <div className="receipt-row">
                    <span>เวลา:</span>
                    <span className="receipt-item-price">{time}</span>
                </div>
                {customerName && (
                    <div className="receipt-row">
                        <span>ลูกค้า:</span>
                        <span className="receipt-item-price">{customerName}</span>
                    </div>
                )}
            </div>

            <hr className="receipt-divider" />

            {/* ===== รายการสินค้า ===== */}
            <div style={{ marginBottom: '2mm' }}>
                {items.map((item, i) => (
                    <div key={i} style={{ marginBottom: '1mm' }}>
                        {/* ชื่อสินค้า */}
                        <div style={{ fontSize: '24px' }}>
                            {item.name}
                        </div>
                        {/* จำนวน x ราคา = รวม */}
                        <div className="receipt-row" style={{ fontSize: '24px', paddingLeft: '2mm' }}>
                            <span className="receipt-item-name">
                                {item.quantity} x {item.price.toLocaleString()}
                            </span>
                            <span className="receipt-item-price">
                                {(item.price * item.quantity).toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <hr className="receipt-divider" />

            {/* ===== สรุปยอด ===== */}
            <div style={{ marginBottom: '2mm' }}>
                <div className="receipt-row" style={{ fontSize: '24px' }}>
                    <span>จำนวนรายการ:</span>
                    <span className="receipt-item-price">{items.length} รายการ ({totalItems} ชิ้น)</span>
                </div>

                <div className="receipt-row receipt-total" style={{ marginTop: '1mm' }}>
                    <span style={{ fontSize: '24px' }}>รวมสุทธิ:</span>
                    <span className="receipt-item-price" style={{ fontSize: '24px' }}>
                        {totalAmount.toLocaleString()} บาท
                    </span>
                </div>
            </div>

            {/* ===== ข้อมูลการชำระ ===== */}
            {paymentMethod === 'cash' && cashReceived !== undefined && (
                <div style={{ fontSize: '20px', marginBottom: '2mm' }}>
                    <hr className="receipt-divider" />
                    <div className="receipt-row">
                        <span>ชำระ:</span>
                        <span className="receipt-item-price">เงินสด</span>
                    </div>
                    <div className="receipt-row">
                        <span>รับมา:</span>
                        <span className="receipt-item-price">{cashReceived.toLocaleString()} บาท</span>
                    </div>
                    <div className="receipt-row">
                        <span>เงินทอน:</span>
                        <span className="receipt-item-price">{(changeAmount || 0).toLocaleString()} บาท</span>
                    </div>
                </div>
            )}

            {paymentMethod === 'transfer' && (
                <div style={{ fontSize: '24px', marginBottom: '2mm' }}>
                    <hr className="receipt-divider" />
                    <div className="receipt-row">
                        <span>ชำระ:</span>
                        <span className="receipt-item-price">เงินโอน</span>
                    </div>
                </div>
            )}

            {/* ===== FOOTER ===== */}
            <hr className="receipt-divider" style={{ fontSize: '24px' }} />
            <div className="receipt-footer" style={{ fontSize: '24px' }}>
                <div>*** {receiptFooter} ***</div>
                <div style={{ marginTop: '1mm' }}>กรุณาเก็บใบเสร็จไว้เป็นหลักฐาน</div>
            </div>
        </div>
    );
}

// Export type for use in other components
export type { ReceiptData, ReceiptItem };
