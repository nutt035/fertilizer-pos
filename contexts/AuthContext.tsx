'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
    id: string;
    name: string;
    role: 'owner' | 'cashier';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (pin: string) => Promise<boolean>;
    logout: () => void;
    isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ตรวจสอบ session จาก localStorage
        const savedUser = localStorage.getItem('pos_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('pos_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (pin: string): Promise<boolean> => {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('pin', pin)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return false;
        }

        const loggedInUser: User = {
            id: data.id,
            name: data.name,
            role: data.role as 'owner' | 'cashier'
        };

        setUser(loggedInUser);
        localStorage.setItem('pos_user', JSON.stringify(loggedInUser));
        return true;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('pos_user');
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            isOwner: user?.role === 'owner'
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// สิทธิ์แต่ละหน้า
export const pagePermissions: Record<string, 'owner' | 'all'> = {
    '/': 'all',           // POS - ทุกคน
    '/orders': 'all',     // ประวัติบิล - ทุกคน
    '/customers': 'all',  // ลูกค้า - ทุกคน
    '/dashboard': 'all',  // ภาพรวม - ทุกคน
    '/stock': 'owner',    // สต็อก - เจ้าของเท่านั้น
    '/stock-card': 'owner', // สต็อกการ์ด - เจ้าของเท่านั้น
    '/categories': 'owner', // จัดหมวดหมู่ - เจ้าของเท่านั้น
    '/settings': 'owner', // ตั้งค่า - เจ้าของเท่านั้น
    '/reports': 'all',    // รายงาน - ทุกคน
    '/transfer': 'all',   // โอนสต็อก - ทุกคน
};

export function canAccessPage(role: 'owner' | 'cashier' | undefined, path: string): boolean {
    if (!role) return false;
    if (role === 'owner') return true;

    const permission = pagePermissions[path];
    return permission === 'all';
}
