'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, TrendingUp, History, ArrowRightLeft, Settings, User, FileSpreadsheet } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'ขายหน้าร้าน', href: '/', icon: <ShoppingCart size={20} /> },
    { name: 'คลังสินค้า', href: '/stock', icon: <Package size={20} /> },
    { name: 'ประวัติบิล', href: '/orders', icon: <History size={20} /> },
    { name: 'โอนย้าย', href: '/transfer', icon: <ArrowRightLeft size={20} /> },
    { name: 'ลูกค้า', href: '/customers', icon: <User size={20} /> },
    { name: 'รายงาน', href: '/reports', icon: <FileSpreadsheet size={20} /> },
    { name: 'ภาพรวม', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { name: 'ตั้งค่า', href: '/settings', icon: <Settings size={29} /> },
  ];

  // ซ่อน Sidebar เวลาพิมพ์ใบเสร็จ
  return (
    <div className="hidden lg:flex flex-col w-64 bg-slate-900 h-screen text-white fixed left-0 top-0 print:hidden z-50">
      <div className="p-6 text-center border-b border-slate-700">
        <h1 className="text-2xl font-black text-yellow-400 tracking-wider">ร้านกิจเจริญเคมีการเกษตร</h1>
        <p className="text-xs text-slate-400 mt-1">ระบบขายหน้าร้าน</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}