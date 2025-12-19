'use client';

import { ToastProvider } from '@/components/common';

export default function ClientProviders({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <ToastProvider>
            {children}
        </ToastProvider>
    );
}
