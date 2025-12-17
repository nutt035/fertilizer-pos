'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
   BarChart3, TrendingUp, DollarSign, ShoppingBag,
   Share2, Loader2, Calendar, Search, FileText, X, Printer, User
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
   const [loading, setLoading] = useState(true);
   const [orders, setOrders] = useState<any[]>([]); // เก็บรายการบิลทั้งหมด
   const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0, totalOrders: 0, cash: 0, transfer: 0 });
   const [chartData, setChartData] = useState<any[]>([]);
   const [topProducts, setTopProducts] = useState<any[]>([]);

   // ส่วนค้นหาและใบเสร็จ
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedOrder, setSelectedOrder] = useState<any>(null); // สำหรับ Modal ใบเสร็จ

   useEffect(() => {
      fetchDashboardData();
   }, []);

   const fetchDashboardData = async () => {
      setLoading(true);

      // ดึงข้อมูล 30 วันย้อนหลัง + ข้อมูลลูกค้า
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: ordersData, error } = await supabase
         .from('orders')
         .select(`
        *,
        customers (name, nickname),
        order_items (product_name, quantity, price, cost)
      `)
         .gte('created_at', thirtyDaysAgo.toISOString())
         .order('created_at', { ascending: false }); // ใหม่สุดขึ้นก่อน

      if (error || !ordersData) {
         console.error('Error:', error);
         setLoading(false);
         return;
      }

      setOrders(ordersData); // เก็บไว้โชว์ในตาราง

      // --- คำนวณ Stats & Graph ---
      let tSales = 0, tProfit = 0, tCash = 0, tTransfer = 0;
      const salesByDate: Record<string, number> = {};
      const productRanking: Record<string, number> = {};

      ordersData.forEach(order => {
         tSales += order.total_amount;
         if (order.payment_method === 'cash') tCash += order.total_amount; else tTransfer += order.total_amount;

         order.order_items.forEach((item: any) => {
            tProfit += (item.price - (item.cost || 0)) * item.quantity;
            productRanking[item.product_name] = (productRanking[item.product_name] || 0) + item.quantity;
         });

         const dateKey = new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
         salesByDate[dateKey] = (salesByDate[dateKey] || 0) + order.total_amount;
      });

      setStats({ totalSales: tSales, totalProfit: tProfit, totalOrders: ordersData.length, cash: tCash, transfer: tTransfer });

      // เตรียมข้อมูลกราฟ (ต้องเรียงวันที่ใหม่ เพราะเราดึงมาแบบ DESC)
      const sortedDates = Object.keys(salesByDate).reverse();
      setChartData(sortedDates.map(date => ({ name: date, ยอดขาย: salesByDate[date] })));

      setTopProducts(Object.keys(productRanking).map(key => ({ name: key, qty: productRanking[key] })).sort((a, b) => b.qty - a.qty).slice(0, 5));
      setLoading(false);
   };

   // กรองบิล (ค้นหาตามเลขบิล หรือ ชื่อลูกค้า)
   const filteredOrders = orders.filter(o =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customers && (o.customers.name.includes(searchTerm) || o.customers.nickname.includes(searchTerm)))
   );

   // ฟังก์ชันต่างๆ
   const handlePrint = () => window.print();
   const sendReportLine = () => { /* ... (โค้ดเดิม) ... */ };
   const handleSendSlipLine = () => {
      if (!selectedOrder) return;
      let msg = `🧾 ใบเสร็จ: ร้านปุ๋ยการเกษตร\n📅 ${new Date(selectedOrder.created_at).toLocaleString('th-TH')}\nยอดรวม: ${selectedOrder.total_amount.toLocaleString()} บาท\nขอบคุณครับ`;
      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(msg)}`, '_blank');
   };

   if (loading) return <div className="flex h-screen items-center justify-center text-blue-600 text-xl font-bold"><Loader2 className="animate-spin mr-2" /> กำลังประมวลผล...</div>;

   return (
      <div className="min-h-screen bg-gray-100 p-4 lg:p-8 font-sans pb-24 lg:pb-8">

         {/* ส่วนใบเสร็จสำหรับปริ้น (ซ่อนไว้) */}
         {selectedOrder && (
            <div id="printable-receipt" className="hidden print:block p-2">
               <div className="text-center font-bold text-xl mb-2">ร้านปุ๋ยการเกษตร</div>
               <div className="text-sm text-center mb-2">บิลเลขที่: #{selectedOrder.id.slice(0, 8)}</div>
               <hr className="border-black mb-2" />
               <div className="text-sm">
                  {selectedOrder.order_items.map((item: any, i: number) => (
                     <div key={i} className="flex justify-between mb-1">
                        <span>{item.product_name} x{item.quantity}</span>
                        <span>{(item.price * item.quantity).toLocaleString()}</span>
                     </div>
                  ))}
               </div>
               <hr className="border-black my-2" />
               <div className="flex justify-between font-bold text-lg">
                  <span>รวมสุทธิ</span><span>{selectedOrder.total_amount.toLocaleString()}</span>
               </div>
               <div className="text-center text-xs mt-4">ขอบคุณครับ</div>
            </div>
         )}

         {/* Header */}
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
               <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                  <BarChart3 size={36} className="text-blue-600" /> แดชบอร์ด & ประวัติ
               </h1>
               <p className="text-gray-500">ภาพรวม 30 วันล่าสุด</p>
            </div>
            <button onClick={() => { }} className="bg-[#06C755] hover:bg-[#05b64d] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md">
               <Share2 /> สรุปยอดเข้า LINE
            </button>
         </div>

         {/* 1. Cards สรุปยอด */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-blue-500">
               <p className="text-gray-500 text-sm font-bold">ยอดขายรวม</p>
               <h3 className="text-3xl font-black text-gray-800 mt-1">{stats.totalSales.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-purple-500">
               <p className="text-gray-500 text-sm font-bold">กำไรขั้นต้น</p>
               <h3 className="text-3xl font-black text-purple-700 mt-1">+{stats.totalProfit.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-green-500">
               <p className="text-gray-500 text-sm font-bold">เงินสด</p>
               <h3 className="text-3xl font-black text-gray-800 mt-1">{stats.cash.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-blue-400">
               <p className="text-gray-500 text-sm font-bold">เงินโอน</p>
               <h3 className="text-3xl font-black text-gray-800 mt-1">{stats.transfer.toLocaleString()}</h3>
            </div>
         </div>

         {/* 2. กราฟ + Top 5 */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
               <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2"><TrendingUp size={24} className="text-blue-500" /> แนวโน้มยอดขาย</h3>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Area type="monotone" dataKey="ยอดขาย" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={3} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
               <h3 className="text-xl font-bold text-gray-700 mb-4">🏆 สินค้าขายดี Top 5</h3>
               <div className="space-y-4">
                  {topProducts.map((p, i) => (
                     <div key={i} className="flex justify-between items-center border-b pb-2">
                        <div className="flex items-center gap-2">
                           <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{i + 1}</span>
                           <span className="text-sm font-bold text-gray-700 truncate w-32">{p.name}</span>
                        </div>
                        <span className="font-black text-blue-600">{p.qty}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* 3. [เพิ่มใหม่] ตารางประวัติบิล (Bill History) */}
         <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText /> รายการบิลย้อนหลัง</h3>
               <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" placeholder="ค้นหาเลขบิล / ชื่อลูกค้า..." className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600">
                     <tr>
                        <th className="p-4">เวลา</th>
                        <th className="p-4">เลขบิล</th>
                        <th className="p-4">ลูกค้า</th>
                        <th className="p-4">ยอดเงิน</th>
                        <th className="p-4 text-center">วิธีจ่าย</th>
                        <th className="p-4 text-center">ดู</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y text-lg">
                     {filteredOrders.slice(0, 50).map((order) => ( // โชว์แค่ 50 บิลล่าสุดกันหน่วง
                        <tr key={order.id} className="hover:bg-blue-50 transition cursor-pointer" onClick={() => setSelectedOrder(order)}>
                           <td className="p-4 text-gray-500 text-base">{new Date(order.created_at).toLocaleDateString('th-TH')} {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                           <td className="p-4 font-mono text-base text-gray-400">#{order.id.slice(0, 6)}</td>
                           <td className="p-4 font-bold text-gray-800">{order.customers ? (order.customers.nickname || order.customers.name) : '-'}</td>
                           <td className="p-4 font-black text-blue-900">{order.total_amount.toLocaleString()}</td>
                           <td className="p-4 text-center">
                              {order.payment_method === 'cash' ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">เงินสด</span> : <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">เงินโอน</span>}
                           </td>
                           <td className="p-4 text-center text-gray-400"><Search size={20} /></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* --- Modal ดูใบเสร็จ --- */}
         {selectedOrder && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-100 p-3 flex justify-between items-center border-b"><h3 className="font-bold text-gray-700">ใบเสร็จรับเงิน</h3><button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={24} /></button></div>
                  <div className="p-6 overflow-y-auto bg-white">
                     <div className="text-center mb-4"><div className="font-black text-2xl text-gray-800">ร้านปุ๋ยการเกษตร</div><div className="text-gray-500 text-sm">#{selectedOrder.id.slice(0, 8)}</div></div>

                     {/* ชื่อลูกค้า */}
                     {selectedOrder.customers && (
                        <div className="text-center mb-4 bg-orange-50 p-2 rounded-lg text-orange-800 font-bold">
                           ลูกค้า: {selectedOrder.customers.nickname || selectedOrder.customers.name}
                        </div>
                     )}

                     <div className="space-y-2 mb-4 text-sm text-gray-700">
                        {selectedOrder.order_items.map((item: any, i: number) => (
                           <div key={i} className="flex justify-between border-b pb-1">
                              <span>{item.product_name} <span className="text-gray-400">x{item.quantity}</span></span>
                              <span className="font-bold">{(item.price * item.quantity).toLocaleString()}</span>
                           </div>
                        ))}
                     </div>
                     <div className="flex justify-between text-xl font-black text-gray-900 mt-4"><span>รวมทั้งสิ้น</span><span>{selectedOrder.total_amount.toLocaleString()}.-</span></div>
                     {selectedOrder.slip_image && (<div className="mt-4"><div className="text-xs text-gray-500 mb-1">สลิปโอนเงิน:</div><img src={selectedOrder.slip_image} className="w-full rounded border" /></div>)}
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
                     <button onClick={handleSendSlipLine} className="w-full bg-[#06C755] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Share2 /> ส่ง LINE</button>
                     <button onClick={handlePrint} className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Printer /> พิมพ์</button>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
}