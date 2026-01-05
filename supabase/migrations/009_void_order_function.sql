-- ===============================================
-- FUNCTION: void_order
-- ยกเลิกบิลและคืนสต็อกเข้าคลัง
-- ===============================================

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
    v_order_item RECORD;
    v_branch_id UUID;  -- เปลี่ยนเป็น UUID
BEGIN
    -- 1) ดึงข้อมูล order
    SELECT * INTO v_order 
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'ไม่พบบิลที่ต้องการยกเลิก');
    END IF;
    
    -- 2) ตรวจสอบสถานะ
    IF v_order.status = 'VOID' THEN
        RETURN jsonb_build_object('success', false, 'message', 'บิลนี้ถูกยกเลิกไปแล้ว');
    END IF;
    
    v_branch_id := v_order.branch_id;
    
    -- 3) คืนสต็อกจาก order_items
    FOR v_order_item IN 
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
        -- คืนสต็อกเข้า inventory
        UPDATE inventory 
        SET quantity = quantity + v_order_item.quantity
        WHERE branch_id = v_branch_id 
          AND product_id = v_order_item.product_id;
        
        -- บันทึก inventory_movements
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
            v_branch_id,
            v_order_item.product_id,
            'VOID',
            v_order_item.quantity,
            inv.quantity,
            'ยกเลิกบิล ' || v_order.receipt_no || ' - ' || p_reason,
            'ORDER_VOID',
            p_order_id
        FROM inventory inv
        WHERE inv.branch_id = v_branch_id 
          AND inv.product_id = v_order_item.product_id;
    END LOOP;
    
    -- 4) อัปเดตสถานะ order เป็น VOID
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
        'receipt_no', v_order.receipt_no
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- เพิ่ม columns ที่จำเป็นสำหรับ void (ถ้ายังไม่มี)
DO $$
BEGIN
    -- void_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'void_reason'
    ) THEN
        ALTER TABLE orders ADD COLUMN void_reason TEXT;
    END IF;
    
    -- voided_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'voided_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN voided_at TIMESTAMPTZ;
    END IF;
    
    -- voided_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'voided_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN voided_by UUID;
    END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION void_order(UUID, UUID, TEXT) TO anon, authenticated;
