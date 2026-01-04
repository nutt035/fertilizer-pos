-- เพิ่ม column cost ใน order_items สำหรับคำนวณกำไร
-- และสร้าง/อัปเดต process_checkout function

-- 1. เพิ่ม cost column ถ้ายังไม่มี
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN order_items.cost IS 'ราคาทุนของสินค้า ณ เวลาที่ขาย (สำหรับคำนวณกำไร)';

-- 2. อัปเดต order_items เก่าที่ไม่มี cost ให้ดึงจาก products
UPDATE order_items oi
SET cost = COALESCE(p.cost, 0)
FROM products p
WHERE oi.product_id = p.id
AND (oi.cost IS NULL OR oi.cost = 0);

-- 3. ลบ function เก่าทุก version ก่อน (ใช้ CASCADE)
DROP FUNCTION IF EXISTS process_checkout CASCADE;

-- 4. สร้าง process_checkout function ใหม่
CREATE OR REPLACE FUNCTION process_checkout(
    p_branch_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_cash_received NUMERIC DEFAULT 0,
    p_change_amount NUMERIC DEFAULT 0,
    p_slip_url TEXT DEFAULT NULL,
    p_points_used INTEGER DEFAULT 0,
    p_discount_code TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_receipt_no TEXT;
    v_subtotal NUMERIC := 0;
    v_grand_total NUMERIC := 0;
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_cost NUMERIC;
    v_item_subtotal NUMERIC;
BEGIN
    -- 1) สร้างเลขที่ใบเสร็จ
    SELECT 'INV-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(receipt_no FROM 5) AS INT)), 0) + 1::INT, 5, '0')
    INTO v_receipt_no
    FROM orders
    WHERE branch_id = p_branch_id;

    -- 2) คำนวณยอดรวมจาก items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'qty')::NUMERIC;
        v_price := (v_item->>'price')::NUMERIC;
        v_item_subtotal := v_qty * v_price;
        v_subtotal := v_subtotal + v_item_subtotal;
    END LOOP;

    v_grand_total := v_subtotal;

    -- 3) สร้าง order
    INSERT INTO orders (
        id,
        branch_id,
        customer_id,
        receipt_no,
        status,
        payment_method,
        subtotal,
        grand_total,
        cash_received,
        change_amount,
        slip_url,
        points_used,
        discount_code,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_branch_id,
        p_customer_id,
        v_receipt_no,
        'COMPLETED',
        p_payment_method,
        v_subtotal,
        v_grand_total,
        p_cash_received,
        p_change_amount,
        p_slip_url,
        p_points_used,
        p_discount_code,
        NOW()
    )
    RETURNING id INTO v_order_id;

    -- 4) สร้าง order_items พร้อม cost
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'qty')::NUMERIC;
        v_price := (v_item->>'price')::NUMERIC;
        v_cost := COALESCE((v_item->>'cost')::NUMERIC, 0);  -- รับ cost จากที่ส่งมา
        v_item_subtotal := v_qty * v_price;

        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            cost,      -- บันทึก cost
            subtotal
        ) VALUES (
            v_order_id,
            v_product_id,
            v_qty,
            v_price,
            v_cost,    -- ราคาทุน ณ เวลาที่ขาย
            v_item_subtotal
        );

        -- 5) ตัดสต็อก
        UPDATE inventory
        SET quantity = quantity - v_qty
        WHERE branch_id = p_branch_id
        AND product_id = v_product_id;

        -- 6) บันทึก inventory movement
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
            p_branch_id,
            v_product_id,
            'SALE',
            -v_qty,
            inv.quantity,
            'ขายสินค้า ' || v_receipt_no,
            'ORDER',
            v_order_id::TEXT
        FROM inventory inv
        WHERE inv.product_id = v_product_id 
        AND inv.branch_id = p_branch_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'receipt_no', v_receipt_no,
        'grand_total', v_grand_total
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_checkout(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_checkout(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER, TEXT, JSONB) TO anon;

COMMENT ON FUNCTION process_checkout IS 'สร้างบิลขายพร้อมบันทึก cost สำหรับคำนวณกำไร และตัดสต็อกอัตโนมัติ';
