'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X, Info } from 'lucide-react';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast Item Component
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const icons = {
        success: <CheckCircle2 className="text-green-500" size={20} />,
        error: <XCircle className="text-red-500" size={20} />,
        warning: <AlertTriangle className="text-amber-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-amber-50 border-amber-200',
        info: 'bg-blue-50 border-blue-200',
    };

    const textColors = {
        success: 'text-green-800',
        error: 'text-red-800',
        warning: 'text-amber-800',
        info: 'text-blue-800',
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgColors[toast.type]} animate-slide-in`}
            role="alert"
        >
            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
            <p className={`flex-1 text-sm font-medium ${textColors[toast.type]}`}>
                {toast.message}
            </p>
            <button
                onClick={onClose}
                className="shrink-0 opacity-60 hover:opacity-100 transition"
                aria-label="ปิด"
            >
                <X size={18} />
            </button>
        </div>
    );
}

// Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback(
        (type: ToastType, message: string, duration = 4000) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const newToast: Toast = { id, type, message, duration };

            setToasts((prev) => [...prev, newToast]);

            // Auto remove after duration
            if (duration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, duration);
            }
        },
        [removeToast]
    );

    const success = useCallback((message: string, duration?: number) => addToast('success', message, duration), [addToast]);
    const error = useCallback((message: string, duration?: number) => addToast('error', message, duration), [addToast]);
    const warning = useCallback((message: string, duration?: number) => addToast('warning', message, duration), [addToast]);
    const info = useCallback((message: string, duration?: number) => addToast('info', message, duration), [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full print:hidden">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
