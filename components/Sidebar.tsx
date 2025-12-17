'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, Users, BarChart3, ArrowRightLeft } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  // รายการเมนูทั้งหมด
  const menuItems = [
    { name: 'ขายหน้าร้าน', path: '/', icon: ShoppingCart },
    { name: 'สต็อกสินค้า', path: '/stock', icon: Package },
    { name: 'โอนของ/สาขา', path: '/transfer', icon: ArrowRightLeft }, // เมนูใหม่
    { name: 'ลูกค้า', path: '/customers', icon: Users }, // เมนูใหม่
    { name: 'สรุปยอด', path: '/dashboard', icon: BarChart3 }, // เปลี่ยนจาก Report เป็น Dashboard
  ];

  return (
    <>
      {/* --- Sidebar สำหรับจอใหญ่ (Desktop/Tablet) --- */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r h-screen fixed left-0 top-0 z-50 shadow-lg">
        {/* Logo ร้าน */}
        <div className="p-6 border-b flex items-center justify-center bg-blue-900 text-white">
          <div className="text-2xl font-black">ร้านปุ๋ย💰</div>
        </div>

        {/* รายการเมนู */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <item.icon size={28} strokeWidth={isActive ? 3 : 2} />
                <span className={`text-lg font-bold ${isActive ? 'text-white' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer ด้านล่าง */}
        <div className="p-4 border-t text-center text-gray-400 text-xs">
          ระบบ POS ร้านปุ๋ย v1.0
        </div>
      </div>

      {/* --- Bottom Bar สำหรับมือถือ (Mobile) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t z-50 flex justify-around p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[10px] font-bold mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}