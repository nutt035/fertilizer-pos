'use client';

import React from 'react';
import { History, X } from 'lucide-react';
import Modal from '../common/Modal';

interface HeldBill {
    id: number;
    items: any[];
    customer: { id: string; name: string; nickname?: string } | null;
    total: number;
    time: string;
}

interface HeldBillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldBills: HeldBill[];
    onRestore: (index: number) => void;
}

export default function HeldBillsModal({
    isOpen,
    onClose,
    heldBills,
    onRestore
}: HeldBillsModalProps) {
    const handleRestore = (index: number) => {
        onRestore(index);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="รายการที่พักไว้"
            titleIcon={<History />}
            headerColor="bg-purple-100 !text-purple-900"
            size="lg"
        >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {heldBills.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">ไม่มีบิลที่พักไว้</div>
                ) : (
                    heldBills.map((bill, index) => (
                        <div
                            key={bill.id}
                            className="bg-white border-2 border-purple-100 p-4 rounded-xl flex justify-between items-center hover:border-purple-500 cursor-pointer shadow-sm transition"
                            onClick={() => handleRestore(index)}
                        >
                            <div>
                                <div className="text-gray-500 text-sm">เวลา: {bill.time} น.</div>
                                <div className="font-bold text-orange-600 text-sm">
                                    {bill.customer ? (bill.customer.nickname || bill.customer.name) : 'ทั่วไป'}
                                </div>
                                <div className="text-lg font-bold text-gray-800">
                                    {bill.items.length} รายการ
                                </div>
                            </div>
                            <div className="text-xl lg:text-2xl font-bold text-purple-700">
                                {bill.total.toLocaleString()}.-
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
}
