'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '@/lib/supabase';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  ShoppingBag,
  PieChart,
  BarChart3,
  Package,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

type OrderItemRow = {
  price: number | string | null;
  cost: number | string | null;
  quantity: number | string | null;
  product_id?: string | number | null;
  products?: { name?: string | null } | null;
};

type OrderRow = {
  id: string | number;
  created_at: string;
  grand_total: number | string | null;
  payment_method: 'cash' | 'transfer' | string | null;
  receipt_no?: string | null;
  customers?: { name?: string | null; nickname?: string | null } | null;
  order_items?: OrderItemRow[] | null;
};

type TopProduct = {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
};

const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const monthLabelTH = (d: Date) =>
  d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [sendingLine, setSendingLine] = useState(false);
  const toast = useToast();

  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    todayCash: 0,
    todayTransfer: 0,
    todayOrders: 0,
    monthSales: 0,
    monthProfit: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData7d, setChartData7d] = useState<any[]>([]);
  const [monthlyChart, setMonthlyChart] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // last 12 months window (including current month)
    const startOf12Months = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    const startOfDayISO = startOfDay.toISOString();
    const startOfMonthISO = startOfMonth.toISOString();
    const startOf12MonthsISO = startOf12Months.toISOString();

    // 1) วันนี้ (คำนวณกำไรจาก order_items)
    const { data: todayData, error: todayErr } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          price,
          cost,
          quantity,
          product_id,
          products ( name )
        )
      `
      )
      .eq('branch_id', CURRENT_BRANCH_ID)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfDayISO);

    if (todayErr) console.error(todayErr);

    let sales = 0;
    let cost = 0;
    let cash = 0;
    let transfer = 0;

    (todayData as OrderRow[] | null)?.forEach((order) => {
      const orderTotal = n(order.grand_total);
      sales += orderTotal;

      if (order.payment_method === 'cash') cash += orderTotal;
      else transfer += orderTotal;

      const orderCost =
        order.order_items?.reduce((sum, item) => sum + n(item.cost) * n(item.quantity), 0) ?? 0;

      cost += orderCost;
    });

    const profit = sales - cost;

    // 2) เดือนนี้ (ดึงพร้อม items เพื่อกำไรรายเดือน)
    const { data: monthData, error: monthErr } = await supabase
      .from('orders')
      .select(
        `
        grand_total,
        order_items (
          cost,
          quantity
        )
      `
      )
      .eq('branch_id', CURRENT_BRANCH_ID)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfMonthISO);

    if (monthErr) console.error(monthErr);

    const monthSales =
      (monthData as any[] | null)?.reduce((sum, o) => sum + n(o.grand_total), 0) ?? 0;

    const monthCost =
      (monthData as any[] | null)?.reduce((sum, o) => {
        const c =
          (o.order_items as any[] | undefined)?.reduce(
            (s, it) => s + n(it.cost) * n(it.quantity),
            0
          ) ?? 0;
        return sum + c;
      }, 0) ?? 0;

    const monthProfit = monthSales - monthCost;

    setStats({
      todaySales: sales,
      todayProfit: profit,
      todayCash: cash,
      todayTransfer: transfer,
      todayOrders: (todayData as any[])?.length || 0,
      monthSales,
      monthProfit,
    });

    // 3) บิลล่าสุด
    const { data: recent } = await supabase
      .from('orders')
      .select('*, customers(name, nickname)')
      .eq('branch_id', CURRENT_BRANCH_ID)
      .order('created_at', { ascending: false })
      .limit(8);

    setRecentOrders(recent || []);

    // 4) กราฟ 7 วันย้อนหลัง (เหมือนเดิม แต่แยก state)
    const dataPoints: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });

      const start = new Date(dateStr).toISOString();
      const end = new Date(new Date(dateStr).getTime() + 86400000).toISOString();

      const { data: dayOrders } = await supabase
        .from('orders')
        .select('grand_total')
        .eq('branch_id', CURRENT_BRANCH_ID)
        .eq('status', 'COMPLETED')
        .gte('created_at', start)
        .lt('created_at', end);

      const total =
        (dayOrders as any[] | null)?.reduce((sum, o) => sum + n(o.grand_total), 0) ?? 0;

      dataPoints.push({ name: dayName, sales: total });
    }
    setChartData7d(dataPoints);

    // 5) รายเดือน 12 เดือน + Top Products
    const { data: orders12m, error: o12Err } = await supabase
      .from('orders')
      .select(
        `
        id,
        created_at,
        grand_total,
        order_items (
          price,
          cost,
          quantity,
          product_id,
          products ( name )
        )
      `
      )
      .eq('branch_id', CURRENT_BRANCH_ID)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOf12MonthsISO);

    if (o12Err) console.error(o12Err);

    // เตรียม bucket รายเดือน
    const months: { key: string; label: string; sales: number; profit: number }[] = [];
    for (let k = 0; k < 12; k++) {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - k), 1);
      months.push({
        key: monthKey(d),
        label: monthLabelTH(d),
        sales: 0,
        profit: 0,
      });
    }

    // aggregate ยอดขาย/กำไรต่อเดือน + top products
    const productMap = new Map<string, TopProduct>();

    (orders12m as OrderRow[] | null)?.forEach((order) => {
      const od = new Date(order.created_at);
      const key = monthKey(od);

      const bucket = months.find((m) => m.key === key);
      const orderSales = n(order.grand_total);

      // คำนวณกำไรแบบ gross profit จาก items
      const orderCost =
        order.order_items?.reduce((sum, item) => sum + n(item.cost) * n(item.quantity), 0) ?? 0;
      const orderProfit = orderSales - orderCost;

      if (bucket) {
        bucket.sales += orderSales;
        bucket.profit += orderProfit;
      }

      // Top products
      (order.order_items ?? []).forEach((it) => {
        const pid = String(it.product_id ?? '');
        if (!pid) return;

        const qty = n(it.quantity);
        const revenue = n(it.price) * qty;
        const pCost = n(it.cost) * qty;
        const pProfit = revenue - pCost;

        const name = it.products?.name ?? 'ไม่ทราบชื่อสินค้า';

        const cur = productMap.get(pid) ?? {
          productId: pid,
          name,
          qty: 0,
          revenue: 0,
          profit: 0,
        };

        cur.qty += qty;
        cur.revenue += revenue;
        cur.profit += pProfit;

        // อัปเดตชื่อกรณีบางรายการไม่มีชื่อ
        if (!cur.name || cur.name === 'ไม่ทราบชื่อสินค้า') cur.name = name;

        productMap.set(pid, cur);
      });
    });

    setMonthlyChart(months.map((m) => ({ name: m.label, sales: m.sales, profit: m.profit })));

    const top = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setTopProducts(top);

    setLoading(false);
  };

  const topProductsChart = useMemo(() => {
    // ทำให้ชื่อไม่ยาวจนอ่านไม่ได้
    return topProducts.map((p) => ({
      name: (p.name ?? '').length > 18 ? `${p.name.slice(0, 18)}…` : p.name,
      revenue: p.revenue,
      qty: p.qty,
      profit: p.profit,
    }));
  }, [topProducts]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition border"
          >
            <ArrowLeft size={20} /> <span className="font-bold">กลับหน้าร้าน</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> ภาพรวมร้าน (Dashboard)
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              setSendingLine(true);
              try {
                const res = await fetch('/api/cron/all-alerts');
                const data = await res.json();
                if (data.success) {
                  toast.success('ส่งแจ้งเตือนไป LINE เรียบร้อย!');
                } else {
                  toast.error('ส่งไม่สำเร็จ: ' + (data.error || 'ไม่มีข้อมูลหรือยังไม่ได้ตั้งค่า LINE'));
                }
              } catch (e: any) {
                toast.error('Error: ' + e.message);
              } finally {
                setSendingLine(false);
              }
            }}
            disabled={sendingLine}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {sendingLine ? <Loader2 className="animate-spin" size={20} /> : <MessageCircle size={20} />}
            ส่ง LINE
          </button>
          <div className="text-right">
            <div className="text-xs text-gray-500">ข้อมูล ณ วันที่</div>
            <div className="font-bold text-gray-800">
              {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* Today cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today Sales */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <DollarSign size={64} />
          </div>
          <div className="relative z-10">
            <div className="text-blue-100 mb-1 font-medium">ยอดขายวันนี้ (บาท)</div>
            <div className="text-4xl font-black tracking-tight">{stats.todaySales.toLocaleString()}</div>
            <div className="mt-2 text-sm bg-white/20 inline-block px-2 py-1 rounded-lg">
              {stats.todayOrders} บิล
            </div>
          </div>
        </div>

        {/* Today Profit */}
        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-gray-500 text-sm font-medium">กำไรขั้นต้น (วันนี้)</div>
              <div className="text-3xl font-black text-green-600 mt-1">
                +{stats.todayProfit.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-100 text-green-600 p-2 rounded-lg">
              <PieChart />
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">* คำนวณจาก (ราคาขาย - ราคาทุน)</div>
        </div>

        {/* Payment split */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3 text-gray-500 font-medium">
            <Wallet size={18} /> แยกตามวิธีชำระเงิน
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
              <div className="flex items-center gap-2 text-green-700 text-sm font-bold mb-1">
                <DollarSign size={16} /> เงินสด
              </div>
              <div className="text-2xl font-black text-green-800">{stats.todayCash.toLocaleString()}</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-bold mb-1">
                <CreditCard size={16} /> เงินโอน
              </div>
              <div className="text-2xl font-black text-blue-800">{stats.todayTransfer.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium">ยอดขายเดือนนี้ (บาท)</div>
              <div className="text-3xl font-black text-blue-700 mt-1">
                {stats.monthSales.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-2">รวมบิลที่สำเร็จ (COMPLETED)</div>
            </div>
            <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
              <BarChart3 />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium">กำไรรวมเดือนนี้ (Gross Profit)</div>
              <div className="text-3xl font-black text-green-700 mt-1">
                +{stats.monthProfit.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-2">คำนวณจาก (ขาย - ทุน) ของรายการสินค้า</div>
            </div>
            <div className="bg-green-50 text-green-700 p-2 rounded-lg">
              <PieChart />
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7d chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" /> แนวโน้มยอดขาย (7 วันล่าสุด)
          </h2>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">กำลังโหลด...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData7d}>
                  <defs>
                    <linearGradient id="colorSales7d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [value.toLocaleString(), 'บาท']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales7d)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* recent orders */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingBag size={20} className="text-purple-500" /> บิลล่าสุด
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
            {recentOrders.length === 0 ? (
              <div className="text-center text-gray-400 py-10">ยังไม่มีรายการ</div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition border border-gray-100">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{order.receipt_no}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      • {order.customers ? (order.customers.nickname || order.customers.name) : 'ทั่วไป'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">+{n(order.grand_total).toLocaleString()}</div>
                    <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-bold ${order.payment_method === 'cash' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {order.payment_method === 'cash' ? 'เงินสด' : 'โอนจ่าย'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" /> สรุปยอดรายเดือน (12 เดือนล่าสุด)
          </h2>
          <div className="text-sm text-gray-500 mb-6">เทียบ “ยอดขาย” และ “กำไรขั้นต้น” รายเดือน</div>

          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">กำลังโหลด...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [Number(value).toLocaleString(), name === 'sales' ? 'ยอดขาย' : 'กำไร']}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="ยอดขาย" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="profit" name="กำไร" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Package size={20} className="text-emerald-600" /> สินค้าขายดี (Top 10)
          </h2>
          <div className="text-sm text-gray-500 mb-4">จัดอันดับจาก “ยอดขายรวม (Revenue)”</div>

          <div className="h-52 w-full mb-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">กำลังโหลด...</div>
            ) : topProductsChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">ยังไม่มีข้อมูลสินค้า</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') return [Number(value).toLocaleString(), 'ยอดขายรวม'];
                      if (name === 'profit') return [Number(value).toLocaleString(), 'กำไรรวม'];
                      return [Number(value).toLocaleString(), name];
                    }}
                  />
                  <Bar dataKey="revenue" name="ยอดขายรวม" radius={[10, 10, 10, 10]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {topProducts.map((p, idx) => (
              <div key={p.productId} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 truncate">
                    #{idx + 1} {p.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ขายไป {p.qty.toLocaleString()} ชิ้น • กำไร {p.profit.toLocaleString()} บาท
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-emerald-700">฿{p.revenue.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400">ยอดขายรวม</div>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <div className="text-center text-gray-400 py-10">ยังไม่มีข้อมูล</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
