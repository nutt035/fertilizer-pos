'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Calendar, FileText, Banknote, CreditCard, Search, Share2, X, Loader2, TrendingUp } from 'lucide-react';

export default function ReportPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // วันที่ที่เลือก (Default เป็นวันนี้)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal ใบเสร็จ
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // --- 1. โหลดข้อมูลบิล ---
  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  const fetchOrders = async () => {
    setLoading(true);
    
    const startDate = `${selectedDate}T00:00:00`;
    const endDate = `${selectedDate}T23:59:59`;

    // ดึงบิล + รายการสินค้าข้างใน (ดึง cost มาด้วยเพื่อคำนวณกำไร)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          product_name,
          quantity,
          price,
          cost
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      alert('โหลดข้อมูลล้มเหลว');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  // --- 2. คำนวณยอดสรุป (Dashboard) ---
  const totalSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalCash = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total_amount, 0);
  const totalTransfer = orders.filter(o => o.payment_method === 'transfer').reduce((sum, o) => sum + o.total_amount, 0);
  const totalBills = orders.length;

  // [ใหม่] คำนวณกำไร
  const totalProfit = orders.reduce((sum, order) => {
    const orderProfit = order.order_items.reduce((pSum: number, item: any) => {
        const itemCost = item.cost || 0;
        return pSum + ((item.price - itemCost) * item.quantity);
    }, 0);
    return sum + orderProfit;
  }, 0);

  // --- 3. ฟังก์ชันส่ง LINE ---
  const handleSendLine = () => {
    if (!selectedOrder) return;

    let msg = `🧾 ใบเสร็จ: ร้านกิจเจริญเคมีเกษตร\n`;
    msg += `📅 วันที่: ${new Date(selectedOrder.created_at).toLocaleString('th-TH')}\n`;
    msg += `----------------\n`;
    
    selectedOrder.order_items.forEach((item: any) => {
      msg += `▪️ ${item.product_name} x${item.quantity} = ${(item.price * item.quantity).toLocaleString()}\n`;
    });
    
    msg += `----------------\n`;
    msg += `💰 ยอดรวม: ${selectedOrder.total_amount.toLocaleString()} บาท\n`;
    msg += `(${selectedOrder.payment_method === 'cash' ? 'เงินสด' : 'เงินโอน'})\n`;
    msg += `\nขอบคุณที่อุดหนุนครับ 🙏`;

    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;
    window.open(lineUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm">
         <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 bg-red-100 text-red-700 px-6 py-3 rounded-xl hover:bg-red-200 transition active:scale-95 border-2 border-red-200">
               <ArrowLeft size={32} strokeWidth={3} />
               <span className="text-2xl font-bold">กลับหน้าร้าน</span>
            </Link>
            <div className="h-10 w-px bg-gray-300 mx-2"></div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
               <FileText size={36} className="text-blue-600" /> สรุปยอดขาย & กำไร
            </h1>
         </div>
         
         <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border">
            <Calendar className="text-gray-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xl font-bold text-gray-700 outline-none cursor-pointer"
            />
         </div>
      </div>

      {/* --- ส่วนที่ 1: Dashboard สรุปยอด --- */}
      <div className="grid grid-cols-4 gap-4 mb-6">
         {/* ยอดขายรวม */}
         <div className="bg-white p-6 rounded-2xl shadow-md border-l-8 border-blue-600">
            <div className="text-gray-500 text-lg mb-1">ยอดขายรวม</div>
            <div className="text-4xl font-black text-blue-800">{totalSales.toLocaleString()}</div>
            <div className="text-sm mt-1 text-gray-400">{totalBills} บิล</div>
         </div>

         {/* [ใหม่] กำไรขั้นต้น */}
         <div className="bg-white p-6 rounded-2xl shadow-md border-l-8 border-purple-500">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
               <TrendingUp /> <span className="font-bold text-xl">กำไรขั้นต้น</span>
            </div>
            <div className="text-4xl font-black text-purple-800">+{totalProfit.toLocaleString()}</div>
            <div className="text-sm mt-1 text-gray-400">
               (Margin: {totalSales > 0 ? ((totalProfit/totalSales)*100).toFixed(1) : 0}%)
            </div>
         </div>

         {/* เงินสด */}
         <div className="bg-white p-6 rounded-2xl shadow-md border-l-8 border-green-500">
            <div className="flex items-center gap-2 text-green-700 mb-2">
               <Banknote /> <span className="font-bold text-xl">เงินสด (ลิ้นชัก)</span>
            </div>
            <div className="text-4xl font-black text-gray-800">{totalCash.toLocaleString()}</div>
         </div>

         {/* เงินโอน */}
         <div className="bg-white p-6 rounded-2xl shadow-md border-l-8 border-blue-400">
             <div className="flex items-center gap-2 text-blue-600 mb-2">
               <CreditCard /> <span className="font-bold text-xl">เงินโอน (แอป)</span>
            </div>
            <div className="text-4xl font-black text-gray-800">{totalTransfer.toLocaleString()}</div>
         </div>
      </div>

      {/* --- ส่วนที่ 2: ตารางประวัติบิล --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
         <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-700">รายการบิลของวันที่ {new Date(selectedDate).toLocaleDateString('th-TH')}</h2>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-100 text-gray-600">
                  <tr>
                     <th className="p-4">เวลา</th>
                     <th className="p-4">เลขบิล</th>
                     <th className="p-4">สินค้า</th>
                     <th className="p-4 text-center">วิธีจ่าย</th>
                     <th className="p-4 text-right">ยอดขาย</th>
                     <th className="p-4 text-right text-purple-600">กำไร</th>
                     <th className="p-4 text-center">ดู</th>
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {loading ? (
                     <tr><td colSpan={7} className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2"/> กำลังโหลด...</td></tr>
                  ) : orders.length === 0 ? (
                     <tr><td colSpan={7} className="p-8 text-center text-gray-400">ไม่มีรายการขายในวันนี้</td></tr>
                  ) : (
                     orders.map((order) => {
                        // คำนวณกำไรต่อบิล
                        const billProfit = order.order_items.reduce((sum: number, item: any) => sum + ((item.price - (item.cost || 0)) * item.quantity), 0);
                        
                        return (
                           <tr key={order.id} className="hover:bg-blue-50 transition cursor-pointer" onClick={() => setSelectedOrder(order)}>
                              <td className="p-4 text-gray-600">
                                 {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </td>
                              <td className="p-4 font-mono text-sm text-gray-400">#{order.id.slice(0, 8)}</td>
                              <td className="p-4">
                                 <span className="font-bold text-gray-800">{order.order_items[0]?.product_name}</span>
                                 {order.order_items.length > 1 && <span className="text-gray-500 text-sm ml-2">+ อีก {order.order_items.length - 1} อย่าง</span>}
                              </td>
                              <td className="p-4 text-center">
                                 {order.payment_method === 'cash' ? (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">เงินสด</span>
                                 ) : (
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">เงินโอน</span>
                                 )}
                              </td>
                              <td className="p-4 text-right font-black text-lg text-blue-900">
                                 {order.total_amount.toLocaleString()}
                              </td>
                              <td className="p-4 text-right font-bold text-purple-600">
                                 +{billProfit.toLocaleString()}
                              </td>
                              <td className="p-4 text-center">
                                 <Search className="text-gray-400" size={20} />
                              </td>
                           </tr>
                        );
                     })
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* --- Modal: ดูใบเสร็จ (Digital Receipt) --- */}
      {selectedOrder && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
                  <h3 className="font-bold text-gray-700">รายละเอียดใบเสร็จ</h3>
                  <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={24}/></button>
               </div>
               
               <div className="p-6 overflow-y-auto bg-white">
                  <div className="text-center mb-4">
                     <div className="font-black text-2xl text-gray-800">ร้านกิจเจริญเคมีเกษตร</div>
                     <div className="text-gray-500 text-sm mt-1">ใบเสร็จรับเงิน</div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-4 border-b pb-2 flex justify-between">
                     <span>วันที่: {new Date(selectedOrder.created_at).toLocaleDateString('th-TH')}</span>
                     <span>เวลา: {new Date(selectedOrder.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                     {selectedOrder.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-gray-700">
                           <div>
                              <div className="font-bold">{item.product_name}</div>
                              <div className="text-xs text-gray-400">{item.quantity} x {item.price.toLocaleString()}</div>
                           </div>
                           <div className="font-bold">{(item.quantity * item.price).toLocaleString()}</div>
                        </div>
                     ))}
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
                     <div className="flex justify-between text-xl font-black text-gray-900">
                        <span>ยอดรวมสุทธิ</span>
                        <span>{selectedOrder.total_amount.toLocaleString()}.-</span>
                     </div>
                     <div className="flex justify-between text-sm text-gray-600">
                        <span>การชำระเงิน</span>
                        <span>{selectedOrder.payment_method === 'cash' ? 'เงินสด' : 'เงินโอน'}</span>
                     </div>
                  </div>
                  
                  {/* แสดงรูปสลิปถ้ามี */}
                  {selectedOrder.slip_image && (
                     <div className="mt-4">
                        <div className="text-xs text-gray-500 mb-1">หลักฐานการโอน:</div>
                        <img src={selectedOrder.slip_image} className="w-full rounded-lg border" />
                     </div>
                  )}

                  <div className="mt-8 text-center text-xs text-gray-400">ขอบคุณที่อุดหนุนครับ</div>
               </div>

               <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
                  <button onClick={handleSendLine} className="w-full bg-[#06C755] hover:bg-[#05b64d] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-lg shadow-sm transition transform active:scale-95">
                     <Share2 size={24} /> ส่งเข้า LINE ลูกค้า
                  </button>
                  <button onClick={() => setSelectedOrder(null)} className="w-full bg-white border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-100">
                     ปิดหน้าต่าง
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}