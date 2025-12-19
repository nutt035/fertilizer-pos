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
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch today's orders
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                grand_total,
                payment_method,
                status,
                order_items(
                    quantity,
                    price,
                    cost
                )
            `)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .eq('status', 'COMPLETED');

        if (error) throw error;

        if (!orders || orders.length === 0) {
            const noSalesMessage = `📊 สรุปยอดขายประจำวัน\n📅 ${new Date().toLocaleDateString('th-TH')}\n\n❌ ไม่มียอดขายวันนี้`;
            await sendLineGroupMessage(noSalesMessage);
            return NextResponse.json({ message: 'No sales today', sent: true });
        }

        // Calculate totals
        const totalSales = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
        const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.grand_total || 0), 0);
        const transferSales = orders.filter(o => o.payment_method === 'transfer').reduce((sum, o) => sum + (o.grand_total || 0), 0);

        // Calculate profit
        let totalCost = 0;
        orders.forEach(order => {
            if (order.order_items) {
                order.order_items.forEach((item: any) => {
                    totalCost += (item.cost || 0) * (item.quantity || 0);
                });
            }
        });
        const profit = totalSales - totalCost;

        const message = `📊 สรุปยอดขายประจำวัน
📅 ${new Date().toLocaleDateString('th-TH')}

💰 ยอดขายรวม: ฿${totalSales.toLocaleString()}
   • เงินสด: ฿${cashSales.toLocaleString()}
   • โอน: ฿${transferSales.toLocaleString()}

📦 จำนวนบิล: ${orders.length} บิล
💵 กำไรโดยประมาณ: ฿${profit.toLocaleString()}

ร้านกิจเจริญเคมีการเกษตร 🌿`;

        const sent = await sendLineGroupMessage(message);

        return NextResponse.json({
            success: sent,
            totalSales,
            orderCount: orders.length,
            profit
        });
    } catch (error: any) {
        console.error('Daily summary cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
