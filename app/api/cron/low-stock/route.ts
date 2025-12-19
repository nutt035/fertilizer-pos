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
        // Fetch low stock products
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                name,
                min_stock_level,
                inventory(quantity)
            `)
            .eq('is_active', true)
            .eq('is_alert_active', true);

        if (error) throw error;

        const lowStockProducts = (products || []).filter((p: any) => {
            const stock = p.inventory?.[0]?.quantity || 0;
            const minLevel = p.min_stock_level || 10;
            return stock <= minLevel;
        });

        if (lowStockProducts.length === 0) {
            return NextResponse.json({ message: 'No low stock products' });
        }

        // Build message
        const productList = lowStockProducts.map((p: any) => {
            const stock = p.inventory?.[0]?.quantity || 0;
            return `• ${p.name}: เหลือ ${stock} ชิ้น`;
        }).join('\n');

        const message = `⚠️ แจ้งเตือนสินค้าใกล้หมด!\n\n${productList}\n\n📅 ${new Date().toLocaleDateString('th-TH')}`;

        const sent = await sendLineGroupMessage(message);

        return NextResponse.json({
            success: sent,
            lowStockCount: lowStockProducts.length
        });
    } catch (error: any) {
        console.error('Low stock cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
