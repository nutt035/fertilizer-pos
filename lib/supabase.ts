import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Branch ID สามารถตั้งค่าใน .env.local ได้ โดยใช้ NEXT_PUBLIC_BRANCH_ID
// ถ้าไม่ได้ตั้งค่า จะใช้ค่า default นี้
export const CURRENT_BRANCH_ID = process.env.NEXT_PUBLIC_BRANCH_ID || '708d5c3b-5e5c-452a-b162-5cd93d070ee0';