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
        console.log('LINE credentials not configured');
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

// ========== 1. สรุปยอดขายประจำวัน ==========
async function getDailySummary(): Promise<string | null> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const { data: orders, error } = await supabase
        .from('orders')
        .select('grand_total, payment_method, order_items(quantity, price, cost)')
        .gte('created_at', startOfDay.toISOString())
        .eq('status', 'COMPLETED');

    if (error || !orders || orders.length === 0) return null;

    const totalSales = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const transferSales = orders.filter(o => o.payment_method === 'transfer').reduce((sum, o) => sum + (o.grand_total || 0), 0);

    let totalCost = 0;
    orders.forEach(order => {
        order.order_items?.forEach((item: any) => {
            totalCost += (item.cost || 0) * (item.quantity || 0);
        });
    });

    return `📊 สรุปยอดขาย ${today.toLocaleDateString('th-TH')}

💰 ยอดขาย: ฿${totalSales.toLocaleString()}
   • เงินสด: ฿${cashSales.toLocaleString()}
   • โอน: ฿${transferSales.toLocaleString()}
📦 จำนวน: ${orders.length} บิล
💵 กำไร: ~฿${(totalSales - totalCost).toLocaleString()}`;
}

// ========== 2. สินค้าใกล้หมด ==========
async function getLowStockAlert(): Promise<string | null> {
    const { data: products, error } = await supabase
        .from('products')
        .select('name, min_stock_level, inventory(quantity)')
        .eq('is_active', true);

    if (error) return null;

    const lowStock = (products || []).filter((p: any) => {
        const stock = p.inventory?.[0]?.quantity || 0;
        const minLevel = p.min_stock_level || 10;
        return stock <= minLevel;
    });

    if (lowStock.length === 0) return null;

    const list = lowStock.slice(0, 10).map((p: any) =>
        `• ${p.name}: เหลือ ${p.inventory?.[0]?.quantity || 0}`
    ).join('\n');

    return `⚠️ สินค้าใกล้หมด (${lowStock.length} รายการ)\n\n${list}`;
}

// ========== 3. สินค้าหมดอายุ ==========
async function getExpiryAlert(): Promise<string | null> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const { data: products, error } = await supabase
        .from('products')
        .select('name, expiry_date')
        .eq('is_active', true)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

    if (error || !products || products.length === 0) return null;

    const list = products.slice(0, 10).map((p: any) =>
        `• ${p.name} (หมด ${new Date(p.expiry_date).toLocaleDateString('th-TH')})`
    ).join('\n');

    return `📅 สินค้าใกล้หมดอายุ (${products.length} รายการ)\n\n${list}`;
}

// ========== Main Handler ==========
export async function GET() {
    try {
        const results: string[] = [];

        // 1. Daily Summary
        const summary = await getDailySummary();
        if (summary) results.push(summary);

        // 2. Low Stock
        const lowStock = await getLowStockAlert();
        if (lowStock) results.push(lowStock);

        // 3. Expiry
        const expiry = await getExpiryAlert();
        if (expiry) results.push(expiry);

        if (results.length === 0) {
            return NextResponse.json({ message: 'No alerts today' });
        }

        // รวมข้อความเป็น 1 ข้อความ
        const fullMessage = results.join('\n\n─────────────\n\n') +
            '\n\n🌿 ร้านกิจเจริญเคมีการเกษตร';

        const sent = await sendLineGroupMessage(fullMessage);

        return NextResponse.json({
            success: sent,
            alertCount: results.length
        });
    } catch (error: any) {
        console.error('Combined cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
