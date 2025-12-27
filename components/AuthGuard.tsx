'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, canAccessPage } from '@/contexts/AuthContext';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        // ถ้าไม่ได้ login และไม่ได้อยู่หน้า login -> redirect ไป login
        if (!user && pathname !== '/login') {
            router.push('/login');
            return;
        }

        // ถ้า login แล้วแต่ไม่มีสิทธิ์เข้าหน้านี้ -> redirect ไปหน้าหลัก
        if (user && !canAccessPage(user.role, pathname)) {
            router.push('/');
            return;
        }
    }, [user, loading, pathname, router]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    // ถ้าไม่มี user และไม่ใช่หน้า login -> แสดง loading (กำลัง redirect)
    if (!user && pathname !== '/login') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังเปลี่ยนเส้นทาง...</p>
                </div>
            </div>
        );
    }

    // ถ้าไม่มีสิทธิ์เข้าหน้านี้ -> แสดง loading (กำลัง redirect)
    if (user && !canAccessPage(user.role, pathname) && pathname !== '/login') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <p className="text-red-500 font-bold text-xl mb-2">⛔ ไม่มีสิทธิ์เข้าถึง</p>
                    <p className="text-gray-500">กำลังเปลี่ยนเส้นทาง...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
