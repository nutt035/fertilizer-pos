import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const backup = await request.json();

        if (!backup.tables || !backup.timestamp) {
            return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
        }

        const results: Record<string, { success: boolean; count: number; error?: string }> = {};

        // Restore each table
        for (const [table, data] of Object.entries(backup.tables)) {
            try {
                if (!Array.isArray(data) || data.length === 0) {
                    results[table] = { success: true, count: 0 };
                    continue;
                }

                // Upsert data (insert or update based on id)
                const { error } = await supabase
                    .from(table)
                    .upsert(data as any[], { onConflict: 'id' });

                if (error) {
                    results[table] = { success: false, count: 0, error: error.message };
                } else {
                    results[table] = { success: true, count: (data as any[]).length };
                }
            } catch (e: any) {
                results[table] = { success: false, count: 0, error: e.message };
            }
        }

        return NextResponse.json({
            message: 'Restore completed',
            backupDate: backup.timestamp,
            results
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
