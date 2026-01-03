'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeStockOptions {
    onProductChange?: () => void;
    onInventoryChange?: () => void;
    onBarcodeChange?: () => void;
    debounceMs?: number;
}

/**
 * Custom hook สำหรับ real-time synchronization ของข้อมูลสต็อก
 * ใช้ Supabase Realtime เพื่อ subscribe การเปลี่ยนแปลงในตาราง:
 * - products
 * - inventory  
 * - product_barcodes
 * 
 * @example
 * ```tsx
 * const { isConnected } = useRealtimeStock({
 *   onProductChange: () => fetchProducts(),
 *   onInventoryChange: () => fetchProducts(),
 *   onBarcodeChange: () => fetchProducts(),
 * });
 * ```
 */
export function useRealtimeStock({
    onProductChange,
    onInventoryChange,
    onBarcodeChange,
    debounceMs = 300,
}: UseRealtimeStockOptions = {}) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const [isConnected, setIsConnected] = useState(false);

    // Debounced callback to prevent too many refreshes
    const debouncedCallback = useCallback((callback?: () => void) => {
        if (!callback) return;

        const now = Date.now();

        // Ignore if less than debounceMs since last update
        if (now - lastUpdateRef.current < debounceMs) {
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            lastUpdateRef.current = Date.now();
            callback();
        }, debounceMs);
    }, [debounceMs]);

    useEffect(() => {
        // Create subscription channel
        const channel = supabase
            .channel(`stock-realtime-${CURRENT_BRANCH_ID}`)
            // Subscribe to products table
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'products'
                },
                (payload) => {
                    console.log('🔄 Real-time: Product changed', payload.eventType);
                    debouncedCallback(onProductChange);
                }
            )
            // Subscribe to inventory table (filter by branch)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventory',
                    filter: `branch_id=eq.${CURRENT_BRANCH_ID}`
                },
                (payload) => {
                    console.log('🔄 Real-time: Inventory changed', payload.eventType);
                    debouncedCallback(onInventoryChange);
                }
            )
            // Subscribe to product_barcodes table
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'product_barcodes'
                },
                (payload) => {
                    console.log('🔄 Real-time: Barcode changed', payload.eventType);
                    debouncedCallback(onBarcodeChange);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time stock sync connected');
                    setIsConnected(true);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Real-time stock sync error');
                    setIsConnected(false);
                } else if (status === 'CLOSED') {
                    setIsConnected(false);
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            setIsConnected(false);
        };
    }, [onProductChange, onInventoryChange, onBarcodeChange, debouncedCallback]);

    return {
        isConnected,
    };
}

