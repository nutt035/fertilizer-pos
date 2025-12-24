'use client';

// Import types from printer.ts (which has Web Serial API type declarations)
import '../lib/printer';

import { useState, useEffect, useCallback } from 'react';
import {
    isWebSerialSupported,
    isPrinterConnected,
    connectPrinter,
    disconnectPrinter,
    openCashDrawer,
} from '../lib/printer';

export interface UsePrinterReturn {
    /** Is printer currently connected */
    isConnected: boolean;
    /** Is Web Serial API supported in this browser */
    isSupported: boolean;
    /** Is currently attempting to connect */
    isConnecting: boolean;
    /** Last error message */
    error: string | null;
    /** Connect to printer (opens port selection dialog) */
    connect: () => Promise<boolean>;
    /** Disconnect from printer */
    disconnect: () => Promise<void>;
    /** Open cash drawer */
    openDrawer: () => Promise<boolean>;
    /** Clear error state */
    clearError: () => void;
}

/**
 * React hook for managing printer connection via Web Serial API
 * 
 * Usage:
 * ```tsx
 * const { isConnected, connect, openDrawer, error } = usePrinter();
 * 
 * // Connect button
 * <button onClick={connect}>เชื่อมต่อเครื่องพิมพ์</button>
 * 
 * // Open drawer after payment
 * if (paymentMethod === 'cash') {
 *   await openDrawer();
 * }
 * ```
 */
export function usePrinter(): UsePrinterReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);

    // Check browser support on mount
    useEffect(() => {
        const supported = isWebSerialSupported();
        setIsSupported(supported);

        if (!supported) {
            setError('เบราว์เซอร์ไม่รองรับ กรุณาใช้ Chrome หรือ Edge');
        }

        // Check if already connected (e.g., after page refresh)
        setIsConnected(isPrinterConnected());
    }, []);

    // Connect to printer
    const connect = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('เบราว์เซอร์ไม่รองรับ กรุณาใช้ Chrome หรือ Edge');
            return false;
        }

        setIsConnecting(true);
        setError(null);

        try {
            await connectPrinter();
            setIsConnected(true);
            return true;
        } catch (err: any) {
            setError(err.message || 'เชื่อมต่อไม่สำเร็จ');
            setIsConnected(false);
            return false;
        } finally {
            setIsConnecting(false);
        }
    }, [isSupported]);

    // Disconnect from printer
    const disconnect = useCallback(async (): Promise<void> => {
        try {
            await disconnectPrinter();
            setIsConnected(false);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'ตัดการเชื่อมต่อไม่สำเร็จ');
        }
    }, []);

    // Open cash drawer
    const openDrawer = useCallback(async (): Promise<boolean> => {
        if (!isConnected) {
            setError('กรุณาเชื่อมต่อเครื่องพิมพ์ก่อน');
            return false;
        }

        try {
            await openCashDrawer();
            console.log('✅ Cash drawer opened via Web Serial API');
            return true;
        } catch (err: any) {
            setError(err.message || 'เปิดลิ้นชักไม่สำเร็จ');
            console.warn('⚠️ Could not open cash drawer:', err);
            return false;
        }
    }, [isConnected]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Listen for disconnect events
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'serial' in navigator) {
            const handleDisconnect = () => {
                setIsConnected(isPrinterConnected());
            };

            navigator.serial.addEventListener('disconnect', handleDisconnect);
            return () => {
                navigator.serial.removeEventListener('disconnect', handleDisconnect);
            };
        }
    }, []);

    return {
        isConnected,
        isSupported,
        isConnecting,
        error,
        connect,
        disconnect,
        openDrawer,
        clearError,
    };
}

export default usePrinter;
