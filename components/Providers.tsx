'use client';

import { ToastProvider } from '@/components/common';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';

export default function ClientProviders({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <ToastProvider>
                <AuthGuard>
                    {children}
                </AuthGuard>
            </ToastProvider>
        </AuthProvider>
    );
}
