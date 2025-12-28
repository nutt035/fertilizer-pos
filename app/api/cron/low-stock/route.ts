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
        // Fetch low stock products with category info and size
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                name,
                size,
                min_stock_level,
                master_categories(id, name),
                master_subcategories(id, name),
                inventory(quantity)
            `)
            .eq('is_active', true)
            .eq('is_alert_active', true);

        if (error) throw error;

        const lowStockProducts = (products || []).filter((p: any) => {
            const stock = p.inventory?.[0]?.quantity || 0;
            const minLevel = p.min_stock_level || 5;
            return stock <= minLevel;
        });

        if (lowStockProducts.length === 0) {
            return NextResponse.json({ message: 'No low stock products' });
        }

        // Group by main category and subcategory
        const grouped: Record<string, Record<string, any[]>> = {};

        lowStockProducts.forEach((p: any) => {
            const categoryName = p.master_categories?.name || 'ไม่ระบุหมวดหมู่';
            const subcategoryName = p.master_subcategories?.name || 'ทั่วไป';

            if (!grouped[categoryName]) {
                grouped[categoryName] = {};
            }
            if (!grouped[categoryName][subcategoryName]) {
                grouped[categoryName][subcategoryName] = [];
            }
            grouped[categoryName][subcategoryName].push(p);
        });

        // Build message with categories
        let messageLines: string[] = [];

        Object.keys(grouped).sort().forEach(category => {
            messageLines.push(`\n📁 ${category}`);

            Object.keys(grouped[category]).sort().forEach(subcategory => {
                messageLines.push(`  📂 ${subcategory}`);

                grouped[category][subcategory].forEach((p: any) => {
                    const stock = p.inventory?.[0]?.quantity || 0;
                    const sizeText = p.size ? ` (${p.size})` : '';
                    messageLines.push(`    • ${p.name}${sizeText}: เหลือ ${stock}`);
                });
            });
        });

        const message = `⚠️ แจ้งเตือนสินค้าใกล้หมด!\n${messageLines.join('\n')}\n\n📅 ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

        const sent = await sendLineGroupMessage(message);

        return NextResponse.json({
            success: sent,
            lowStockCount: lowStockProducts.length,
            grouped
        });
    } catch (error: any) {
        console.error('Low stock cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
