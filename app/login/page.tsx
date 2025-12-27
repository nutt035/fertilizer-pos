'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // ถ้า login แล้ว redirect ไปหน้าหลัก
        if (user) {
            router.push('/');
        }
        inputRef.current?.focus();
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            setError('กรุณากรอก PIN 4 หลัก');
            return;
        }

        setLoading(true);
        setError('');

        const success = await login(pin);

        if (success) {
            router.push('/');
        } else {
            setError('PIN ไม่ถูกต้อง');
            setPin('');
            inputRef.current?.focus();
        }

        setLoading(false);
    };

    const handlePinChange = (value: string) => {
        // รับเฉพาะตัวเลข
        const numericValue = value.replace(/\D/g, '').slice(0, 4);
        setPin(numericValue);
        setError('');

        // Auto-submit เมื่อครบ 4 หลัก
        if (numericValue.length === 4) {
            setTimeout(() => {
                document.getElementById('login-form')?.dispatchEvent(
                    new Event('submit', { bubbles: true, cancelable: true })
                );
            }, 100);
        }
    };

    const handleNumpadClick = (num: string) => {
        if (num === 'clear') {
            setPin('');
            setError('');
        } else if (num === 'back') {
            setPin(prev => prev.slice(0, -1));
        } else if (pin.length < 4) {
            handlePinChange(pin + num);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={40} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800">เข้าสู่ระบบ</h1>
                    <p className="text-gray-500 mt-2">กรุณากรอก PIN 4 หลัก</p>
                </div>

                <form id="login-form" onSubmit={handleSubmit}>
                    {/* PIN Display */}
                    <div className="flex justify-center gap-3 mb-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${pin[i] ? 'border-green-500 bg-green-50' : 'border-gray-300'
                                    }`}
                            >
                                {pin[i] ? '●' : ''}
                            </div>
                        ))}
                    </div>

                    {/* Hidden Input for keyboard */}
                    <input
                        ref={inputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={(e) => handlePinChange(e.target.value)}
                        className="sr-only"
                        autoComplete="off"
                    />

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
                            <AlertCircle size={18} />
                            <span className="font-bold">{error}</span>
                        </div>
                    )}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => handleNumpadClick(num)}
                                className={`h-16 rounded-xl text-2xl font-bold transition active:scale-95 ${num === 'clear'
                                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                        : num === 'back'
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    }`}
                            >
                                {num === 'clear' ? 'C' : num === 'back' ? '⌫' : num}
                            </button>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || pin.length < 4}
                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span>กำลังตรวจสอบ...</span>
                        ) : (
                            <>
                                <User size={24} /> เข้าสู่ระบบ
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
