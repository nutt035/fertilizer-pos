'use client';

import React, { useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { Search, FileText, XCircle, Printer, Download, Eye } from 'lucide-react';
import useBranchSettings from '../../hooks/useBranchSettings';
import { ReceiptPrint, ReceiptData } from '../../components/pos';

export default function OrdersPage() {
    // ข้อมูลร้าน/สาขา (แก้ไขได้ที่ Settings > ข้อมูลร้าน)
    const { settings: branchSettings } = useBranchSettings();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // State สำหรับ Modal ใบเสร็จ
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*, customers(name), order_items(product_id, quantity, price, subtotal, products(name))')
            .eq('branch_id', CURRENT_BRANCH_ID)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error) setOrders(data || []);
        setLoading(false);
    };

    // เปิดดูใบเสร็จ
    const openReceipt = (order: any) => {
        setSelectedOrder(order);
        setIsReceiptOpen(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleVoid = async (orderId: string) => {
        const reason = prompt('กรุณาระบุเหตุผลการยกเลิกบิล:');
        if (!reason) return;

        // เรียก RPC void_order (ต้องสร้างใน DB แล้ว)
        const { data, error } = await supabase.rpc('void_order', {
            p_order_id: orderId,
            p_user_id: null,
            p_reason: reason
        });

        if (error || !data?.success) {
            alert('ยกเลิกไม่สำเร็จ: ' + (error?.message || data?.message));
        } else {
            alert('✅ ยกเลิกบิลเรียบร้อย');
            fetchOrders();
        }
    };

    const filteredOrders = orders.filter(o => o.receipt_no.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2"><FileText /> ประวัติการขาย</h1>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="ค้นหาเลขที่ใบเสร็จ..." className="w-full pl-10 border p-2 rounded-lg focus:outline-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                        <tr>
                            <th className="p-4">ใบเสร็จ</th>
                            <th className="p-4">เวลา</th>
                            <th className="p-4">ลูกค้า</th>
                            <th className="p-4 text-right">ยอดรวม</th>
                            <th className="p-4 text-center">สถานะ</th>
                            <th className="p-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id} className={`border-b hover:bg-gray-50 transition ${order.status === 'VOID' ? 'bg-red-50' : ''}`}>
                                <td className="p-4 font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => openReceipt(order)}>{order.receipt_no}</td>
                                <td className="p-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleString('th-TH')}</td>
                                <td className="p-4">{order.customers?.name || 'ลูกค้าทั่วไป'}</td>
                                <td className="p-4 text-right font-bold">{order.grand_total.toLocaleString()}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                        {order.status === 'COMPLETED' ? 'สำเร็จ' : 'ยกเลิก'}
                                    </span>
                                </td>
                                <td className="p-4 text-center flex justify-center gap-2">
                                    <button onClick={() => openReceipt(order)} className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg" title="ดู/พิมพ์"><Printer size={18} /></button>
                                    {order.status === 'COMPLETED' && (
                                        <button onClick={() => handleVoid(order.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg" title="ยกเลิกบิล"><XCircle size={18} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- Receipt Modal (สำหรับพิมพ์) --- */}
            {isReceiptOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md max-h-[95vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gray-700 p-3 flex justify-between items-center print:hidden">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                🧾 ตัวอย่างใบเสร็จ
                            </h3>
                            <button onClick={() => setIsReceiptOpen(false)} className="text-gray-300 hover:text-red-400">
                                <XCircle />
                            </button>
                        </div>

                        {/* Receipt Paper Look */}
                        <div className="overflow-y-auto flex-1 p-6 flex justify-center bg-gray-900">
                            <div
                                className="bg-white shadow-xl w-full max-w-[300px] font-mono text-sm leading-tight"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 2px)',
                                    borderTop: '8px dotted #ccc',
                                    borderBottom: '8px dotted #ccc',
                                }}
                            >
                                <div className="p-4">
                                    {/* Header ร้าน */}
                                    <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
                                        <div className="text-lg font-bold">{branchSettings.name || 'ร้านค้า'}</div>
                                        {branchSettings.address && <div className="text-xs text-gray-600">{branchSettings.address}</div>}
                                        {branchSettings.phone && <div className="text-xs text-gray-600">โทร: {branchSettings.phone}</div>}
                                        {branchSettings.tax_id && <div className="text-xs text-gray-600">TAX ID: {branchSettings.tax_id}</div>}
                                    </div>

                                    {/* ข้อมูลบิล */}
                                    <div className="text-xs mb-3 border-b border-dashed border-gray-200 pb-2">
                                        <div className="flex justify-between"><span>เลขที่:</span><span className="font-bold">{selectedOrder.receipt_no}</span></div>
                                        <div className="flex justify-between"><span>วันที่:</span><span>{new Date(selectedOrder.created_at).toLocaleDateString('th-TH')}</span></div>
                                        <div className="flex justify-between"><span>เวลา:</span><span>{new Date(selectedOrder.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                        <div className="flex justify-between"><span>ลูกค้า:</span><span>{selectedOrder.customers?.name || 'ทั่วไป'}</span></div>
                                    </div>

                                    {/* รายการสินค้า */}
                                    <div className="text-xs mb-3">
                                        {selectedOrder.order_items.map((item: any, idx: number) => (
                                            <div key={idx} className="mb-1">
                                                <div className="font-medium">{item.products?.name || 'สินค้า'}</div>
                                                <div className="flex justify-between pl-2 text-gray-600">
                                                    <span>{item.quantity} x {item.price.toLocaleString()}</span>
                                                    <span>{(item.quantity * item.price).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* สรุปยอด */}
                                    <div className="border-t-2 border-dashed border-gray-300 pt-2 mt-2">
                                        <div className="flex justify-between text-base font-bold">
                                            <span>รวมสุทธิ</span>
                                            <span>{selectedOrder.grand_total.toLocaleString()} ฿</span>
                                        </div>
                                        {selectedOrder.payment_method === 'cash' && (
                                            <>
                                                <div className="flex justify-between text-xs text-gray-600">
                                                    <span>รับมา</span>
                                                    <span>{selectedOrder.cash_received?.toLocaleString()} ฿</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-600">
                                                    <span>ทอน</span>
                                                    <span>{(selectedOrder.cash_received - selectedOrder.grand_total).toLocaleString()} ฿</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-between text-xs mt-1">
                                            <span>ชำระ</span>
                                            <span className="font-medium">{selectedOrder.payment_method === 'cash' ? '💵 เงินสด' : '📲 เงินโอน'}</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="text-center text-xs text-gray-500 mt-4 pt-3 border-t border-dashed border-gray-200">
                                        <div>*** {branchSettings.receipt_footer || 'ขอบคุณที่อุดหนุน'} ***</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="p-3 border-t border-gray-700 bg-gray-800 print:hidden flex justify-end gap-2">
                            <button onClick={() => setIsReceiptOpen(false)} className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg">ปิด</button>
                            <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                <Printer size={18} /> สั่งพิมพ์
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ใบเสร็จสำหรับปริ้นจริง (ซ่อนไว้) */}
            {selectedOrder && (
                <ReceiptPrint
                    isPreview={false}
                    data={{
                        receiptNo: selectedOrder.receipt_no,
                        date: new Date(selectedOrder.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                        time: new Date(selectedOrder.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                        customerName: selectedOrder.customers?.name || 'ทั่วไป',
                        items: selectedOrder.order_items.map((item: any) => ({
                            name: item.products?.name || 'สินค้า',
                            quantity: item.quantity,
                            price: item.price,
                            unit: 'ชิ้น'
                        })),
                        totalAmount: selectedOrder.grand_total,
                        paymentMethod: selectedOrder.payment_method,
                        cashReceived: selectedOrder.cash_received,
                        changeAmount: selectedOrder.payment_method === 'cash' ? (selectedOrder.cash_received - selectedOrder.grand_total) : 0,
                        shopName: branchSettings.name,
                        shopAddress: branchSettings.address,
                        shopPhone: branchSettings.phone,
                        shopTaxId: branchSettings.tax_id,
                        receiptHeader: branchSettings.receipt_header,
                        receiptFooter: branchSettings.receipt_footer
                    }}
                />
            )}

        </div>
    );
}