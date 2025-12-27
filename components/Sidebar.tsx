'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Package, TrendingUp, History, ArrowRightLeft, Settings, User, FileSpreadsheet, Menu, X, LogOut } from 'lucide-react';
import { useAuth, canAccessPage } from '@/contexts/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  // ถ้าอยู่หน้า login ไม่แสดง sidebar
  if (pathname === '/login') {
    return null;
  }

  // ถ้า loading หรือไม่มี user ไม่แสดงอะไรเลย
  if (loading || !user) {
    return null;
  }

  const allMenuItems = [
    { name: 'ขาย', href: '/', icon: <ShoppingCart size={20} /> },
    { name: 'สต็อก', href: '/stock', icon: <Package size={20} /> },
    { name: 'บิล', href: '/orders', icon: <History size={20} /> },
    { name: 'ลูกค้า', href: '/customers', icon: <User size={20} /> },
    { name: 'ภาพรวม', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { name: 'รายงาน', href: '/reports', icon: <FileSpreadsheet size={20} /> },
    { name: 'โอนย้าย', href: '/transfer', icon: <ArrowRightLeft size={20} /> },
    { name: 'ตั้งค่า', href: '/settings', icon: <Settings size={20} /> },
  ];

  // กรองเมนูตาม role
  const menuItems = allMenuItems.filter(item => canAccessPage(user.role, item.href));

  // Bottom nav items (แสดงเฉพาะ 5 หลักบนมือถือ)
  const bottomNavItems = menuItems.slice(0, 5);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Sidebar - ซ่อนบนมือถือ */}
      <div className="hidden lg:flex flex-col w-64 bg-slate-900 h-screen text-white fixed left-0 top-0 print:hidden z-50">
        <div className="p-6 text-center border-b border-slate-700">
          <h1 className="text-2xl font-black text-yellow-400 tracking-wider">ร้านกิจเจริญเคมีการเกษตร</h1>
          <p className="text-xs text-slate-400 mt-1">ระบบขายหน้าร้าน</p>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <User size={20} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">{user.name}</div>
            <div className="text-xs text-slate-400">
              {user.role === 'owner' ? '👑 เจ้าของ' : '👤 พนักงาน'}
            </div>
          </div>
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

        {/* Logout button */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/30 transition"
          >
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 print:hidden pb-safe">
        <nav className="flex justify-around items-center py-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${isActive
                  ? 'text-yellow-400'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                {React.cloneElement(item.icon, { size: 22 })}
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
          {/* More button to open full menu */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-slate-400 hover:text-white transition"
          >
            <Menu size={22} />
            <span className="text-[10px] font-bold">เพิ่มเติม</span>
          </button>
        </nav>
      </div>

      {/* Mobile Drawer Menu (Full menu) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 text-white shadow-2xl animate-slide-in">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <div className="font-bold text-sm">{user.name}</div>
                  <div className="text-xs text-slate-400">
                    {user.role === 'owner' ? '👑 เจ้าของ' : '👤 พนักงาน'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                      }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t border-slate-700 mt-auto">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/30 transition"
              >
                <LogOut size={20} />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
