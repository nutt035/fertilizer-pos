'use client';

import { useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../lib/supabase';

export interface BranchSettings {
    id: string;
    name: string;
    address: string;
    phone: string;
    tax_id: string;
    receipt_header: string;
    receipt_footer: string;
}

const defaultSettings: BranchSettings = {
    id: '',
    name: 'ร้านค้า',
    address: '',
    phone: '',
    tax_id: '',
    receipt_header: '',
    receipt_footer: 'ขอบคุณที่อุดหนุน',
};

/**
 * Hook สำหรับดึงข้อมูลสาขาปัจจุบัน
 * ใช้งาน: const { settings, loading, refetch } = useBranchSettings();
 * 
 * ข้อมูลที่ได้:
 * - settings.name = ชื่อร้าน/สาขา
 * - settings.address = ที่อยู่
 * - settings.phone = เบอร์โทร  
 * - settings.tax_id = เลขผู้เสียภาษี
 * - settings.receipt_header = ข้อความ header ใบเสร็จ
 * - settings.receipt_footer = ข้อความ footer ใบเสร็จ
 * 
 * แก้ไขได้ที่ Settings > ข้อมูลร้าน & สาขา
 */
export function useBranchSettings() {
    const [settings, setSettings] = useState<BranchSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('branches')
                .select('*')
                .eq('id', CURRENT_BRANCH_ID)
                .single();

            if (fetchError) {
                setError(fetchError.message);
                return;
            }

            if (data) {
                setSettings({
                    id: String(data.id),
                    name: data.name || defaultSettings.name,
                    address: data.address || '',
                    phone: data.phone || '',
                    tax_id: data.tax_id || '',
                    receipt_header: data.receipt_header || '',
                    receipt_footer: data.receipt_footer || defaultSettings.receipt_footer,
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return {
        settings,
        loading,
        error,
        refetch: fetchSettings
    };
}

export default useBranchSettings;
