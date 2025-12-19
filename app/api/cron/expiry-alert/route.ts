import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

const LINE_API_BASE = 'https://api.line.me/v2/bot';

async function sendLineGroupMessage(message: string): Promise<boolean> {
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const groupId = process.env.LINE_GROUP_ID;

    if (!channelToken || !groupId) {
        console.error('LINE credentials not configured');
        return false;
    }

    try {
        const response = await fetch(`${LINE_API_BASE}/message/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelToken}`
            },
            body: JSON.stringify({
                to: groupId,
                messages: [{ type: 'text', text: message }]
            })
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to send LINE message:', error);
        return false;
    }
}

export async function GET() {
    try {
        const today = new Date();
        const daysAhead = 30; // แจ้งเตือนสินค้าที่จะหมดอายุใน 30 วัน

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        // Fetch products expiring soon
        const { data: products, error } = await supabase
            .from('products')
            .select('name, expiry_date')
            .eq('is_active', true)
            .not('expiry_date', 'is', null)
            .lte('expiry_date', futureDate.toISOString().split('T')[0])
            .order('expiry_date', { ascending: true });

        if (error) throw error;

        if (!products || products.length === 0) {
            return NextResponse.json({ message: 'No expiring products' });
        }

        // Group by urgency
        const expired: any[] = [];
        const expiringThisWeek: any[] = [];
        const expiringThisMonth: any[] = [];

        const oneWeekLater = new Date();
        oneWeekLater.setDate(oneWeekLater.getDate() + 7);

        products.forEach((p: any) => {
            const expiryDate = new Date(p.expiry_date);
            if (expiryDate < today) {
                expired.push(p);
            } else if (expiryDate <= oneWeekLater) {
                expiringThisWeek.push(p);
            } else {
                expiringThisMonth.push(p);
            }
        });

        // Build message
        let message = `📅 แจ้งเตือนสินค้าหมดอายุ\n${new Date().toLocaleDateString('th-TH')}\n`;

        if (expired.length > 0) {
            message += `\n🚨 หมดอายุแล้ว (${expired.length} รายการ):\n`;
            expired.forEach((p: any) => {
                message += `• ${p.name} (หมด ${new Date(p.expiry_date).toLocaleDateString('th-TH')})\n`;
            });
        }

        if (expiringThisWeek.length > 0) {
            message += `\n⚠️ หมดอายุใน 7 วัน (${expiringThisWeek.length} รายการ):\n`;
            expiringThisWeek.forEach((p: any) => {
                message += `• ${p.name} (หมด ${new Date(p.expiry_date).toLocaleDateString('th-TH')})\n`;
            });
        }

        if (expiringThisMonth.length > 0) {
            message += `\n⏰ หมดอายุใน 30 วัน (${expiringThisMonth.length} รายการ):\n`;
            expiringThisMonth.slice(0, 5).forEach((p: any) => {
                message += `• ${p.name} (หมด ${new Date(p.expiry_date).toLocaleDateString('th-TH')})\n`;
            });
            if (expiringThisMonth.length > 5) {
                message += `   ... และอีก ${expiringThisMonth.length - 5} รายการ\n`;
            }
        }

        const sent = await sendLineGroupMessage(message);

        return NextResponse.json({
            success: sent,
            expired: expired.length,
            expiringThisWeek: expiringThisWeek.length,
            expiringThisMonth: expiringThisMonth.length
        });
    } catch (error: any) {
        console.error('Expiry alert cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
