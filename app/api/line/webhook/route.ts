import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/lineoa';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

interface LineEvent {
    type: string;
    source: {
        type: string;
        userId?: string;
    };
    message?: {
        type: string;
        text?: string;
    };
    follow?: any;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-line-signature') || '';

        // Verify signature in production
        if (process.env.NODE_ENV === 'production') {
            if (!verifyLineSignature(body, signature)) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const { events } = JSON.parse(body);

        for (const event of events as LineEvent[]) {
            if (event.type === 'follow' && event.source.userId) {
                // User followed the OA - save their LINE ID for future notifications
                console.log('New LINE follower:', event.source.userId);

                // Could link to existing customer by phone number or name
                // For now just log it
            }

            if (event.type === 'message' && event.message?.type === 'text') {
                const userId = event.source.userId;
                const text = event.message.text || '';

                // Simple command handling
                if (text === 'แต้ม' || text === 'points') {
                    // Find customer by line_id
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('name, points')
                        .eq('line_id', userId)
                        .single();

                    if (customer) {
                        // Reply would need LINE reply API
                        console.log(`Points query from ${customer.name}: ${customer.points}`);
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('LINE webhook error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        configured: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
}
