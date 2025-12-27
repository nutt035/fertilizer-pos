'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    titleIcon?: React.ReactNode;
    headerColor?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-6xl'
};

export default function Modal({
    isOpen,
    onClose,
    title,
    titleIcon,
    headerColor = 'bg-blue-600',
    size = 'md',
    children,
    footer
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className={`bg-white w-full ${sizeClasses[size]} rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto`}>
                {/* Header */}
                <div className={`${headerColor} p-4 font-bold text-lg text-white flex justify-between items-center`}>
                    <div className="flex gap-2 items-center">
                        {titleIcon}
                        {title}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 bg-white/20 rounded-full hover:bg-white/40 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 bg-gray-50 flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
