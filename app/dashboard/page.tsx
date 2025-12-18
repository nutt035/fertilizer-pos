'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '@/lib/supabase';
import { ArrowLeft, TrendingUp, DollarSign, Wallet, CreditCard, ShoppingBag, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    todayCash: 0,
    todayTransfer: 0,
    todayOrders: 0,
    monthSales: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 1. ดึงข้อมูลออเดอร์ "วันนี้" พร้อมรายการสินค้า (เพื่อคำนวณกำไร)
    const { data: todayData } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          price,
          cost,
          quantity
        )
      `)
      .eq('branch_id', CURRENT_BRANCH_ID)
      .eq('status', 'COMPLETED') // เอาเฉพาะบิลที่สำเร็จ
      .gte('created_at', startOfDay);

    // --- คำนวณยอดวันนี้ ---
    let sales = 0;
    let cost = 0;
    let cash = 0;
    let transfer = 0;

    todayData?.forEach((order: any) => {
        const orderTotal = Number(order.grand_total) || 0;
        sales += orderTotal;

        // แยกประเภทการจ่าย
        if (order.payment_method === 'cash') {
            cash += orderTotal;
        } else {
            transfer += orderTotal;
        }

        // คำนวณต้นทุน (Sum cost ของทุก item ในบิลนี้)
        const orderCost = order.order_items?.reduce((sum: number, item: any) => {
            return sum + (Number(item.cost) * Number(item.quantity));
        }, 0) || 0;
        
        cost += orderCost;
    });

    const profit = sales - cost; // กำไรขั้นต้น (Gross Profit)

    // 2. ดึงยอดขาย "เดือนนี้" (เฉพาะยอดรวม)
    const { data: monthData } = await supabase
      .from('orders')
      .select('grand_total')
      .eq('branch_id', CURRENT_BRANCH_ID)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfMonth);

    const monthSales = monthData?.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0) || 0;

    setStats({
      todaySales: sales,
      todayProfit: profit,
      todayCash: cash,
      todayTransfer: transfer,
      todayOrders: todayData?.length || 0,
      monthSales: monthSales
    });

    // 3. ดึงบิลล่าสุด
    const { data: recent } = await supabase
      .from('orders')
      .select('*, customers(name, nickname)')
      .eq('branch_id', CURRENT_BRANCH_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setRecentOrders(recent || []);

    // 4. กราฟ 7 วันย้อนหลัง
    const dataPoints = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
        
        const start = new Date(dateStr).toISOString();
        const end = new Date(new Date(dateStr).getTime() + 86400000).toISOString();
        
        // Query ยอดขายรายวัน (แบบง่าย)
        const { data: dayOrders } = await supabase
            .from('orders')
            .select('grand_total')
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('status', 'COMPLETED')
            .gte('created_at', start)
            .lt('created_at', end);
            
        const total = dayOrders?.reduce((sum, o) => sum + Number(o.grand_total), 0) || 0;
        dataPoints.push({ name: dayName, sales: total });
    }
    setChartData(dataPoints);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8 bg-white p-4 rounded-2xl shadow-sm">
         <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition border">
               <ArrowLeft size={20} /> <span className="font-bold">กลับหน้าร้าน</span>
            </Link>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
               <TrendingUp className="text-blue-600" /> ภาพรวมร้าน (Dashboard)
            </h1>
         </div>
         <div className="text-right">
             <div className="text-xs text-gray-400">ข้อมูล ณ วันที่</div>
             <div className="font-bold text-gray-700">{new Date().toLocaleDateString('th-TH', { dateStyle: 'long'})}</div>
         </div>
      </div>

      {/* --- ส่วนสรุปยอดวันนี้ (Highlight) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: ยอดขายรวม */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign size={64}/></div>
           <div className="relative z-10">
               <div className="text-blue-100 mb-1 font-medium">ยอดขายวันนี้ (บาท)</div>
               <div className="text-4xl font-black tracking-tight">{stats.todaySales.toLocaleString()}</div>
               <div className="mt-2 text-sm bg-white/20 inline-block px-2 py-1 rounded-lg">
                   {stats.todayOrders} บิล
               </div>
           </div>
        </div>
        
        {/* Card 2: กำไรขั้นต้น */}
        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-2">
              <div>
                  <div className="text-gray-500 text-sm font-medium">กำไรขั้นต้น (วันนี้)</div>
                  <div className="text-3xl font-black text-green-600 mt-1">+{stats.todayProfit.toLocaleString()}</div>
              </div>
              <div className="bg-green-100 text-green-600 p-2 rounded-lg"><PieChart /></div>
           </div>
           <div className="text-xs text-gray-400 mt-2">* คำนวณจาก (ราคาขาย - ราคาทุน)</div>
        </div>

        {/* Card 3: แยกประเภทเงิน (เงินสด/โอน) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 text-gray-500 font-medium"><Wallet size={18}/> แยกตามวิธีชำระเงิน</div>
            <div className="flex gap-4">
                <div className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-bold mb-1"><DollarSign size={16}/> เงินสด</div>
                    <div className="text-2xl font-black text-green-800">{stats.todayCash.toLocaleString()}</div>
                </div>
                <div className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 text-sm font-bold mb-1"><CreditCard size={16}/> เงินโอน</div>
                    <div className="text-2xl font-black text-blue-800">{stats.todayTransfer.toLocaleString()}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Chart Section */}
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> แนวโน้มยอดขาย (7 วันล่าสุด)</h2>
            <div className="h-80 w-full">
               {loading ? <div className="h-full flex items-center justify-center text-gray-400">กำลังโหลด...</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                            formatter={(value: number) => [value.toLocaleString(), 'บาท']}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
               )}
            </div>
         </div>

         {/* Recent Orders */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingBag size={20} className="text-purple-500"/> บิลล่าสุด</h2>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                {recentOrders.length === 0 ? <div className="text-center text-gray-400 py-10">ยังไม่มีรายการขายวันนี้</div> : recentOrders.map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition border border-gray-100">
                        <div>
                            <div className="font-bold text-gray-800 text-sm">{order.receipt_no}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                {new Date(order.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.
                                • {order.customers ? (order.customers.nickname || order.customers.name) : 'ทั่วไป'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-blue-600">+{order.grand_total.toLocaleString()}</div>
                            <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-bold ${order.payment_method === 'cash' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {order.payment_method === 'cash' ? 'เงินสด' : 'โอนจ่าย'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         </div>

      </div>
    </div>
  );
}