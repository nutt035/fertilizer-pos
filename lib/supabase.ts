import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- เพิ่มส่วนนี้ ---
// TODO: ใส่ UUID ของสาขา HQ ที่คุณได้จาก Table 'branches'
export const CURRENT_BRANCH_ID = '708d5c3b-5e5c-452a-b162-5cd93d070ee0';