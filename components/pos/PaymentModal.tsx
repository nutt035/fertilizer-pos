'use client';

import React, { useState } from 'react';
import { Banknote, CreditCard, Upload, X, Loader2, Printer, Star } from 'lucide-react';
import Modal from '../common/Modal';
import { Customer } from '../../types';

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
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [usePoints, setUsePoints] = useState(false);

    // Points calculation
    const customerPoints = selectedCustomer?.points || 0;
    const pointsValue = usePoints ? customerPoints : 0; // 1 point = 1 baht
    const finalAmount = Math.max(0, totalAmount - pointsValue);

    const changeAmount = Number(cashReceived) - finalAmount;

    const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSlipFile(file);
            setSlipPreview(URL.createObjectURL(file));
        }
    };

    const handleConfirm = async () => {
        setProcessing(true);
        try {
            await onConfirmPayment(paymentMethod, Number(cashReceived), slipFile);
            // Reset state
            setCashReceived('');
            setSlipFile(null);
            setSlipPreview(null);
            setPaymentMethod('cash');
        } catch (error: any) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
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
                        onClick={onPrint}
                        className="px-6 py-3 lg:px-8 lg:py-4 rounded-xl text-lg lg:text-xl font-bold text-gray-600 hover:bg-gray-200 transition flex items-center gap-2"
                    >
                        <Printer /> พิมพ์
                    </button>
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
            <div className="space-y-6">
                {/* Customer Badge */}
                <div className="text-center">
                    <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-bold">
                        ลูกค้า: {selectedCustomer ? (selectedCustomer.nickname || selectedCustomer.name) : 'ทั่วไป'}
                    </span>
                </div>

                {/* Points Section */}
                {selectedCustomer && customerPoints > 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Star className="text-yellow-500" fill="currentColor" />
                                <span className="font-bold text-yellow-700">แต้มสะสม: {customerPoints.toLocaleString()} แต้ม</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={usePoints}
                                    onChange={e => setUsePoints(e.target.checked)}
                                    className="w-5 h-5 accent-yellow-500"
                                />
                                <span className="text-yellow-700 font-bold">ใช้แต้ม</span>
                            </label>
                        </div>
                        {usePoints && (
                            <div className="mt-2 text-sm text-yellow-600">
                                หัก {pointsValue.toLocaleString()} บาท (เหลือ {customerPoints.toLocaleString()} แต้ม)
                            </div>
                        )}
                    </div>
                )}

                {/* Total Amount */}
                <div className="text-center">
                    <div className="text-gray-500 text-lg lg:text-xl">ยอดที่ต้องชำระ</div>
                    {usePoints && pointsValue > 0 && (
                        <div className="text-gray-400 line-through text-xl">
                            {totalAmount.toLocaleString()}.-
                        </div>
                    )}
                    <div className="text-5xl lg:text-7xl font-black text-blue-800">
                        {finalAmount.toLocaleString()}.-
                    </div>
                </div>

                {/* Payment Method Toggle */}
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setPaymentMethod('cash');
                            setCashReceived('');
                        }}
                        className={`flex-1 py-4 lg:py-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${paymentMethod === 'cash'
                            ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <Banknote size={32} className="lg:w-10 lg:h-10" />
                        <span className="text-xl lg:text-2xl font-bold">เงินสด</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex-1 py-4 lg:py-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${paymentMethod === 'transfer'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <CreditCard size={32} className="lg:w-10 lg:h-10" />
                        <span className="text-xl lg:text-2xl font-bold">เงินโอน</span>
                    </button>
                </div>

                {/* Cash Input */}
                {paymentMethod === 'cash' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="text-xl lg:text-2xl font-bold w-1/3 text-gray-700">รับเงินมา:</label>
                            <input
                                type="number"
                                autoFocus
                                className="flex-1 text-right text-3xl lg:text-4xl p-3 lg:p-4 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none text-gray-800 placeholder-gray-300"
                                placeholder="0.00"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                            />
                        </div>
                        <div className={`flex items-center gap-4 p-4 lg:p-6 rounded-xl border-2 ${changeAmount < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                            }`}>
                            <label className="text-xl lg:text-2xl font-bold w-1/3 text-gray-700">เงินทอน:</label>
                            <div className={`flex-1 text-right text-4xl lg:text-5xl font-black ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'
                                }`}>
                                {cashReceived ? changeAmount.toLocaleString() : '0'}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* QR Code */}
                        <div className="text-center bg-gray-50 p-4 lg:p-6 rounded-xl border-2 border-dashed border-gray-300">
                            <p className="text-gray-500 mb-2">สแกน QR Code เพื่อชำระเงิน</p>
                            <div className="w-40 h-40 lg:w-48 lg:h-48 mx-auto mb-4 flex items-center justify-center rounded-lg overflow-hidden border">
                                <img src="/qrcode.jpg" className="w-full h-full object-cover" alt="QR Code" />
                            </div>
                            <p className="text-lg lg:text-xl font-bold text-gray-800">ร้านปุ๋ยการเกษตร</p>
                            <p className="text-blue-600 font-bold text-base lg:text-lg">ธ.กสิกรไทย 123-4-56789-0</p>
                        </div>

                        {/* Slip Upload */}
                        <div className="border-t pt-4">
                            <label className="block text-gray-700 font-bold mb-2 text-lg">หลักฐานการโอน (สลิป)</label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleSlipChange}
                                        className="hidden"
                                        id="slip-upload"
                                    />
                                    <label
                                        htmlFor="slip-upload"
                                        className="flex items-center justify-center gap-2 w-full p-3 lg:p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 text-blue-600 font-bold cursor-pointer hover:bg-blue-100 transition"
                                    >
                                        <Upload />
                                        {slipFile ? 'เปลี่ยนรูปสลิป' : 'ถ่ายรูป / อัปโหลดสลิป'}
                                    </label>
                                </div>
                                {slipPreview && (
                                    <div className="relative w-20 h-20 lg:w-24 lg:h-24 border rounded-lg overflow-hidden">
                                        <img src={slipPreview} className="w-full h-full object-cover" alt="Slip preview" />
                                        <button
                                            onClick={() => {
                                                setSlipFile(null);
                                                setSlipPreview(null);
                                            }}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
