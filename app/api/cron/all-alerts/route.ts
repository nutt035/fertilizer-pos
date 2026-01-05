import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

const LINE_API_BASE = 'https://api.line.me/v2/bot';
const MAX_MESSAGE_LENGTH = 4500; // LINE limit is 5000, leave buffer

async function sendLineGroupMessage(message: string): Promise<boolean> {
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const groupId = process.env.LINE_GROUP_ID;

    if (!channelToken || !groupId) {
        console.log('LINE credentials not configured');
        return false;
    }

    try {
        // แบ่งข้อความถ้ายาวเกิน
        const messages: string[] = [];
        if (message.length <= MAX_MESSAGE_LENGTH) {
            messages.push(message);
        } else {
            // แบ่งตาม newline
            const lines = message.split('\n');
            let current = '';
            for (const line of lines) {
                if ((current + '\n' + line).length > MAX_MESSAGE_LENGTH) {
                    if (current) messages.push(current.trim());
                    current = line;
                } else {
                    current = current ? current + '\n' + line : line;
                }
            }
            if (current) messages.push(current.trim());
        }

        // ส่งทีละข้อความ
        for (const msg of messages) {
            const response = await fetch(`${LINE_API_BASE}/message/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${channelToken}`
                },
                body: JSON.stringify({
                    to: groupId,
                    messages: [{ type: 'text', text: msg }]
                })
            });

            if (!response.ok) {
                console.error('LINE send failed:', await response.text());
                return false;
            }

            // รอ 100ms ระหว่างข้อความ (ป้องกัน rate limit)
            if (messages.length > 1) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        return true;
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
        .select('grand_total, payment_method, order_items(quantity, price, cost, products(cost))')
        .gte('created_at', startOfDay.toISOString())
        .eq('status', 'COMPLETED');

    if (error || !orders || orders.length === 0) return null;

    const totalSales = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const transferSales = orders.filter(o => o.payment_method === 'transfer').reduce((sum, o) => sum + (o.grand_total || 0), 0);

    let totalCost = 0;
    orders.forEach(order => {
        order.order_items?.forEach((item: any) => {
            const costFromOrder = item.cost || 0;
            const costFromProduct = item.products?.cost || 0;
            let itemCost = costFromOrder > 0 ? costFromOrder : costFromProduct;

            const sellPrice = item.price || 0;
            const qty = item.quantity || 0;

            // HEURISTIC FIX: Sync with Dashboard logic
            if (itemCost > sellPrice * 1.5 && sellPrice > 0) {
                itemCost = sellPrice * 0.85;
            }

            totalCost += itemCost * qty;
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
        .select(`
            name,
            size,
            min_stock_level,
            master_categories(id, name),
            master_subcategories(id, name),
            inventory(quantity)
        `)
        .eq('is_active', true);

    if (error) return null;

    const lowStock = (products || []).filter((p: any) => {
        const stock = p.inventory?.[0]?.quantity || 0;
        const minLevel = p.min_stock_level || 5;
        return stock <= minLevel;
    });

    if (lowStock.length === 0) return null;

    // Group by main category and subcategory
    const grouped: Record<string, Record<string, any[]>> = {};

    lowStock.forEach((p: any) => {
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

    return `⚠️ สินค้าใกล้หมด (${lowStock.length} รายการ)${messageLines.join('\n')}`;
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

    const list = products.slice(0, 999).map((p: any) =>
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
