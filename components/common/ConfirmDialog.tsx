'use client';

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

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
        icon: <AlertTriangle size={24} />,
        confirmColor: 'bg-blue-600 hover:bg-blue-700'
    }
};

export default function ConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    title = 'ยืนยันการดำเนินการ',
    message,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    type = 'danger'
}: ConfirmDialogProps) {
    const config = typeConfig[type];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            titleIcon={config.icon}
            headerColor={config.headerColor}
            size="sm"
            footer={
                <>
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`${config.confirmColor} text-white px-6 py-2 rounded-lg font-bold transition`}
                    >
                        {confirmText}
                    </button>
                </>
            }
        >
            <div className="text-center py-4">
                <p className="text-lg text-gray-700">{message}</p>
            </div>
        </Modal>
    );
}
