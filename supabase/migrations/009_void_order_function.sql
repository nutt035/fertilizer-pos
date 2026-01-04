-- Function สำหรับยกเลิกบิลและคืนสต็อก
-- ลบ function เดิมถ้ามี แล้วสร้างใหม่

DROP FUNCTION IF EXISTS void_order(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION void_order(
    p_order_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'ยกเลิกบิล'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_restored_count INT := 0;
BEGIN
    -- 1) ดึง order และตรวจสอบสถานะ
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'ไม่พบบิลนี้');
    END IF;
    
    IF v_order.status = 'VOID' THEN
        RETURN jsonb_build_object('success', false, 'message', 'บิลนี้ถูกยกเลิกไปแล้ว');
    END IF;
    
    -- 2) วนลูปคืนสต็อกทุก item ในบิล
    FOR v_item IN 
        SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
        -- คืนสต็อกใน inventory
        UPDATE inventory 
        SET quantity = quantity + v_item.quantity
        WHERE product_id = v_item.product_id 
        AND branch_id = v_order.branch_id;
        
        -- บันทึก inventory movement
        INSERT INTO inventory_movements (
            branch_id,
            product_id,
            type,
            quantity,
            balance_after,
            reason,
            ref_type,
            ref_id
        )
        SELECT 
            v_order.branch_id,
            v_item.product_id,
            'VOID_RETURN',
            v_item.quantity,  -- จำนวนบวก (คืน)
            inv.quantity,     -- balance หลังคืน
            'ยกเลิกบิล ' || v_order.receipt_no || ': ' || p_reason,
            'ORDER_VOID',
            p_order_id        -- ใช้ UUID โดยตรง ไม่ต้อง cast เป็น TEXT
        FROM inventory inv
        WHERE inv.product_id = v_item.product_id 
        AND inv.branch_id = v_order.branch_id;
        
        v_restored_count := v_restored_count + 1;
    END LOOP;
    
    -- 3) อัปเดตสถานะ order เป็น VOID
    UPDATE orders 
    SET 
        status = 'VOID',
        void_reason = p_reason,
        voided_at = NOW(),
        voided_by = p_user_id
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'ยกเลิกบิลและคืนสต็อกเรียบร้อย',
        'restored_items', v_restored_count
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION void_order(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION void_order(UUID, UUID, TEXT) TO anon;

-- เพิ่ม columns สำหรับเก็บข้อมูลการ void
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS void_reason TEXT,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID;

COMMENT ON FUNCTION void_order(UUID, UUID, TEXT) IS 'ยกเลิกบิลและคืนสต็อกอัตโนมัติ';
