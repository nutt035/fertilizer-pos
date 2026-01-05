'use client';

import React, { useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { Search, FileText, XCircle, Printer, Download, Eye, BarChart3 } from 'lucide-react';
import useBranchSettings from '../../hooks/useBranchSettings';
import { useToast } from '../../components/common/Toast';
import { ReceiptPrint, ReceiptData } from '../../components/pos';
import ProfitBreakdownModal from '../../components/dashboard/ProfitBreakdownModal';

export default function OrdersPage() {
    // ข้อมูลร้าน/สาขา (แก้ไขได้ที่ Settings > ข้อมูลร้าน)
    const { settings: branchSettings } = useBranchSettings();
    const toast = useToast();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // State สำหรับ Modal ใบเสร็จ
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);

    // Profit Analysis Modal
    const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
    const [profitBreakdownData, setProfitBreakdownData] = useState<any[]>([]);
    const [selectedOrderForAnalysis, setSelectedOrderForAnalysis] = useState<any>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*, customers(name), order_items(product_id, quantity, price, cost, subtotal, products(name, size, cost))')
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
            toast.error('ยกเลิกไม่สำเร็จ: ' + (error?.message || data?.message));
        } else {
            toast.success('ยกเลิกบิลเรียบร้อย');
            fetchOrders();
        }
    };

    const handleAnalyzeProfit = (order: any) => {
        const breakdown = order.order_items.map((item: any) => {
            const costFromOrder = Number(item.cost || 0);
            const costFromProduct = Number(item.products?.cost || 0);
            let itemCost = costFromOrder > 0 ? costFromOrder : costFromProduct;

            const sellPrice = Number(item.price || 0);
            const qty = Number(item.quantity || 0);

            // Heuristic Fix (Same as Dashboard)
            if (itemCost > sellPrice * 1.5 && sellPrice > 0) {
                itemCost = sellPrice * 0.85;
            }

            const profit = (sellPrice - itemCost) * qty;
            const sales = sellPrice * qty;

            const pName = item.products?.name || 'สินค้าไม่ระบุชื่อ';
            const pSize = item.products?.size ? ` (${item.products.size})` : '';

            return {
                name: pName + pSize,
                profit: profit,
                sales: sales
            };
        });

        // Group by name (in case of duplicate items unlikely but safe)
        const groupedMap = new Map();
        breakdown.forEach((b: any) => {
            const existing = groupedMap.get(b.name) || { name: b.name, profit: 0, sales: 0 };
            existing.profit += b.profit;
            existing.sales += b.sales;
            groupedMap.set(b.name, existing);
        });

        setProfitBreakdownData(Array.from(groupedMap.values()));
        setSelectedOrderForAnalysis(order);
        setIsProfitModalOpen(true);
    };

    const filteredOrders = orders.filter(o => o.receipt_no.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                    <a href="/" className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 sm:px-4 sm:py-2 rounded-xl hover:bg-red-200 transition border-2 border-red-200">
                        <span className="text-sm sm:text-base font-bold">← หน้าร้าน</span>
                    </a>
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 sm:w-6 sm:h-6" /> ประวัติการขาย</h1>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขที่ใบเสร็จ..."
                        className="w-full pl-10 border p-3 rounded-lg focus:outline-blue-500 text-base"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
                {filteredOrders.map(order => (
                    <div
                        key={order.id}
                        className={`bg-white rounded-xl shadow-sm p-4 ${order.status === 'VOID' ? 'border-2 border-red-200 bg-red-50' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div
                                    className="font-mono font-bold text-blue-600 text-lg cursor-pointer"
                                    onClick={() => openReceipt(order)}
                                >
                                    {order.receipt_no}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(order.created_at).toLocaleString('th-TH')}
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                {order.status === 'COMPLETED' ? 'สำเร็จ' : 'ยกเลิก'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-600">{order.customers?.name || 'ลูกค้าทั่วไป'}</span>
                            <span className="text-xl font-bold text-gray-800">฿{order.grand_total.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                            <button
                                onClick={() => handleAnalyzeProfit(order)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-50 text-purple-600 rounded-lg font-bold text-sm"
                            >
                                <BarChart3 size={16} /> กำไร
                            </button>
                            <button
                                onClick={() => openReceipt(order)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm"
                            >
                                <Printer size={16} /> พิมพ์
                            </button>
                            {order.status === 'COMPLETED' && (
                                <button
                                    onClick={() => handleVoid(order.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm"
                                >
                                    <XCircle size={16} /> ยกเลิก
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {filteredOrders.length === 0 && (
                    <div className="text-center text-gray-400 py-10">ไม่พบรายการ</div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
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
                                        <button onClick={() => handleAnalyzeProfit(order)} className="text-purple-500 hover:text-purple-700 hover:bg-purple-50 p-2 rounded-lg" title="วิเคราะห์กำไร"><BarChart3 size={18} /></button>
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
                            description: item.products?.description,  // รายละเอียดสินค้า
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

            {/* Profit Analysis Modal */}
            <ProfitBreakdownModal
                isOpen={isProfitModalOpen}
                onClose={() => setIsProfitModalOpen(false)}
                title={`กำไรของบิล ${selectedOrderForAnalysis?.receipt_no || ''}`}
                data={profitBreakdownData}
            />
        </div>
    );
}