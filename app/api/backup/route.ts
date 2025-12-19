import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function GET() {
    try {
        const backup: Record<string, any> = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            tables: {}
        };

        // Tables to backup
        const tables = [
            'products',
            'customers',
            'master_categories',
            'master_units',
            'product_barcodes',
            'product_split_recipes',
            'branches'
        ];

        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*');
            if (error) {
                console.error(`Error backing up ${table}:`, error);
                continue;
            }
            backup.tables[table] = data;
        }

        // Create JSON response
        const json = JSON.stringify(backup, null, 2);

        return new NextResponse(json, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
