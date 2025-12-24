'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, X } from 'lucide-react';

// Types
type DialogType = 'danger' | 'warning' | 'info' | 'success';

interface DialogOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: DialogType;
    showInput?: boolean;
    inputPlaceholder?: string;
    inputDefaultValue?: string;
}

interface DialogState extends DialogOptions {
    isOpen: boolean;
    resolve: ((value: boolean | string | null) => void) | null;
}

// Type configs
const typeConfig = {
    danger: {
        headerColor: 'bg-red-600',
        icon: <Trash2 size={24} />,
        confirmColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
        headerColor: 'bg-orange-500',
        icon: <AlertTriangle size={24} />,
        confirmColor: 'bg-orange-500 hover:bg-orange-600'
    },
    info: {
        headerColor: 'bg-blue-600',
        icon: <Info size={24} />,
        confirmColor: 'bg-blue-600 hover:bg-blue-700'
    },
    success: {
        headerColor: 'bg-green-600',
        icon: <CheckCircle2 size={24} />,
        confirmColor: 'bg-green-600 hover:bg-green-700'
    }
};

// Hook
export function useConfirmDialog() {
    const [dialog, setDialog] = useState<DialogState>({
        isOpen: false,
        message: '',
        resolve: null
    });

    const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialog({
                ...options,
                isOpen: true,
                showInput: false,
                resolve: (value) => resolve(value as boolean)
            });
        });
    }, []);

    const prompt = useCallback((options: DialogOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            setDialog({
                ...options,
                isOpen: true,
                showInput: true,
                resolve: (value) => resolve(value as string | null)
            });
        });
    }, []);

    const handleConfirm = useCallback((inputValue?: string) => {
        if (dialog.resolve) {
            if (dialog.showInput) {
                dialog.resolve(inputValue || '');
            } else {
                dialog.resolve(true);
            }
        }
        setDialog(prev => ({ ...prev, isOpen: false }));
    }, [dialog]);

    const handleCancel = useCallback(() => {
        if (dialog.resolve) {
            if (dialog.showInput) {
                dialog.resolve(null);
            } else {
                dialog.resolve(false);
            }
        }
        setDialog(prev => ({ ...prev, isOpen: false }));
    }, [dialog]);

    return { dialog, confirm, prompt, handleConfirm, handleCancel };
}

// Dialog Component
interface ConfirmDialogProviderProps {
    dialog: DialogState;
    onConfirm: (inputValue?: string) => void;
    onCancel: () => void;
}

export function ConfirmDialogRenderer({ dialog, onConfirm, onCancel }: ConfirmDialogProviderProps) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    const config = typeConfig[dialog.type || 'info'];

    // Reset input when dialog opens
    useEffect(() => {
        if (dialog.isOpen) {
            setInputValue(dialog.inputDefaultValue || '');
            // Focus input or confirm button
            setTimeout(() => {
                if (dialog.showInput && inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                } else if (confirmRef.current) {
                    confirmRef.current.focus();
                }
            }, 100);
        }
    }, [dialog.isOpen, dialog.showInput, dialog.inputDefaultValue]);

    // Handle Enter key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!dialog.isOpen) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (dialog.showInput) {
                    onConfirm(inputValue);
                } else {
                    onConfirm();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dialog.isOpen, dialog.showInput, inputValue, onConfirm, onCancel]);

    if (!dialog.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md animate-scale-in">
                {/* Header */}
                <div className={`${config.headerColor} text-white p-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        {config.icon}
                        <h3 className="font-bold text-lg">{dialog.title || 'ยืนยัน'}</h3>
                    </div>
                    <button onClick={onCancel} className="hover:bg-white/20 p-1 rounded-lg transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-700 text-lg text-center mb-4">{dialog.message}</p>

                    {dialog.showInput && (
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={dialog.inputPlaceholder || 'กรอกข้อมูล...'}
                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-blue-500"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition"
                    >
                        {dialog.cancelText || 'ยกเลิก'}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={() => dialog.showInput ? onConfirm(inputValue) : onConfirm()}
                        className={`${config.confirmColor} text-white px-6 py-2.5 rounded-lg font-bold transition flex items-center gap-2`}
                    >
                        {dialog.confirmText || 'ยืนยัน'}
                        <span className="text-xs opacity-75 bg-white/20 px-2 py-0.5 rounded">Enter</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Add animation style
const style = `
@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-scale-in {
  animation: scale-in 0.15s ease-out;
}
`;

// Inject style
if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = style;
    if (!document.querySelector('[data-confirm-dialog-style]')) {
        styleEl.setAttribute('data-confirm-dialog-style', '');
        document.head.appendChild(styleEl);
    }
}
