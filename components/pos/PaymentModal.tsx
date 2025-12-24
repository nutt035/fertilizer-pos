'use client';

import React, { useState } from 'react';
import { Banknote, CreditCard, Loader2, Star } from 'lucide-react';
import Modal from '../common/Modal';
import { Customer } from '../../types';
import { useToast } from '../common/Toast';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    selectedCustomer: Customer | null;
    onConfirmPayment: (
        paymentMethod: 'cash' | 'transfer',
        cashReceived: number,
        slipFile: File | null
    ) => Promise<void>;
    onPrint: () => void;
}

export default function PaymentModal({
    isOpen,
    onClose,
    totalAmount,
    selectedCustomer,
    onConfirmPayment,
    onPrint
}: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [processing, setProcessing] = useState(false);
    const [usePoints, setUsePoints] = useState(false);
    const toast = useToast();

    // Points calculation
    const customerPoints = selectedCustomer?.points || 0;
    const pointsValue = usePoints ? customerPoints : 0;
    const finalAmount = Math.max(0, totalAmount - pointsValue);
    const changeAmount = Number(cashReceived) - finalAmount;

    const handleConfirm = async () => {
        setProcessing(true);
        try {
            await onConfirmPayment(paymentMethod, Number(cashReceived), null);
            // Reset state
            setCashReceived('');
            setPaymentMethod('cash');
            setUsePoints(false);
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="ยืนยันการชำระเงิน"
            headerColor="bg-gray-100 !text-gray-800"
            size="xl"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 lg:px-8 lg:py-4 rounded-xl text-lg lg:text-xl font-bold text-gray-600 hover:bg-gray-200 transition"
                    >
                        แก้ไข
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={(paymentMethod === 'cash' && changeAmount < 0) || processing}
                        className="px-6 py-3 lg:px-10 lg:py-4 rounded-xl text-lg lg:text-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : 'ยืนยัน'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Customer + Points Row */}
                <div className="flex items-center justify-between gap-4">
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                        ลูกค้า: {selectedCustomer ? (selectedCustomer.nickname || selectedCustomer.name) : 'ทั่วไป'}
                    </span>
                    {selectedCustomer && customerPoints > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 px-3 py-1 rounded-full">
                            <Star size={16} className="text-yellow-500" fill="currentColor" />
                            <span className="text-sm font-bold text-yellow-700">{customerPoints} แต้ม</span>
                            <input
                                type="checkbox"
                                checked={usePoints}
                                onChange={e => setUsePoints(e.target.checked)}
                                className="w-4 h-4 accent-yellow-500"
                            />
                        </label>
                    )}
                </div>

                {/* Total Amount */}
                <div className="text-center py-2">
                    <div className="text-gray-500 text-lg">ยอดที่ต้องชำระ</div>
                    {usePoints && pointsValue > 0 && (
                        <div className="text-gray-400 line-through text-lg">
                            {totalAmount.toLocaleString()}.-
                        </div>
                    )}
                    <div className="text-5xl lg:text-6xl font-black text-blue-800">
                        {finalAmount.toLocaleString()}.-
                    </div>
                </div>

                {/* Payment Method Toggle */}
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setPaymentMethod('cash');
                            setCashReceived('');
                        }}
                        className={`flex-1 py-4 lg:py-5 rounded-xl border-2 flex items-center justify-center gap-2 transition ${paymentMethod === 'cash'
                            ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <Banknote size={28} />
                        <span className="text-xl lg:text-2xl font-bold">เงินสด</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex-1 py-4 lg:py-5 rounded-xl border-2 flex items-center justify-center gap-2 transition ${paymentMethod === 'transfer'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <CreditCard size={28} />
                        <span className="text-xl lg:text-2xl font-bold">เงินโอน</span>
                    </button>
                </div>

                {/* Cash Input */}
                {paymentMethod === 'cash' ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-xl lg:text-2xl font-bold w-1/3 text-gray-700">รับเงินมา:</label>
                            <input
                                type="number"
                                autoFocus
                                className="flex-1 text-right text-3xl lg:text-4xl p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none text-gray-800 placeholder-gray-300"
                                placeholder="0.00"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                            />
                        </div>
                        <div className={`flex items-center gap-3 p-4 lg:p-5 rounded-xl border-2 ${changeAmount < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                            }`}>
                            <label className="text-xl lg:text-2xl font-bold w-1/3 text-gray-700">เงินทอน:</label>
                            <div className={`flex-1 text-right text-4xl lg:text-5xl font-black ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'
                                }`}>
                                {cashReceived ? changeAmount.toLocaleString() : '0'}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Transfer - Just show confirmation message */
                    <div className="text-center py-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <div className="text-6xl mb-3">📱</div>
                        <p className="text-xl lg:text-2xl font-bold text-blue-700">
                            รับเงินผ่าน K Shop แล้ว
                        </p>
                        <p className="text-gray-500 mt-2">
                            กดยืนยันเพื่อปริ้นใบเสร็จ
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
