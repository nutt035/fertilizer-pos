-- ===============================================
-- FUNCTION: process_checkout (อัปเดต)
-- เพิ่มการบันทึก cost ลงใน order_items
-- ===============================================

-- Drop existing function first (all signatures)
DROP FUNCTION IF EXISTS process_checkout(INT, UUID, TEXT, NUMERIC, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS process_checkout(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, JSONB);

CREATE OR REPLACE FUNCTION process_checkout(
    p_branch_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_cash_received NUMERIC DEFAULT 0,
    p_change_amount NUMERIC DEFAULT 0,
    p_slip_image TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_discount NUMERIC DEFAULT 0
)

RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_receipt_no TEXT;
    v_grand_total NUMERIC := 0;
    v_subtotal NUMERIC := 0;
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_cost NUMERIC;
    v_note TEXT;
    v_seq INT;
    v_year_month TEXT;
    v_prefix TEXT;
BEGIN
    -- 1) Generate receipt number (HQ-YYYYMM-NNNN)
    v_year_month := TO_CHAR(NOW(), 'YYYYMM');
    v_prefix := 'HQ-' || v_year_month || '-';

    SELECT COALESCE(MAX(
        CASE 
            WHEN receipt_no LIKE v_prefix || '%' 
            THEN CAST(SUBSTRING(receipt_no FROM LENGTH(v_prefix) + 1) AS INT)
            ELSE 0 
        END
    ), 0) + 1 
    INTO v_seq
    FROM orders 
    WHERE branch_id = p_branch_id
      AND receipt_no LIKE v_prefix || '%';

    v_receipt_no := v_prefix || LPAD(v_seq::TEXT, 4, '0');

    -- 2) Calculate total amount (Subtotal)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'qty')::NUMERIC;
        v_price := (v_item->>'price')::NUMERIC;
        v_subtotal := v_subtotal + (v_qty * v_price);
    END LOOP;

    -- 3) Calculate Grand Total (Subtotal - Discount)
    v_grand_total := v_subtotal - p_discount;
    IF v_grand_total < 0 THEN v_grand_total := 0; END IF;

    -- 4) Create order
    INSERT INTO orders (
        branch_id,
        customer_id,
        receipt_no,
        total_amount,   -- Subtotal
        discount,       -- Discount
        grand_total,    -- Net Total (Subtotal - Discount)
        payment_method,
        cash_received,
        change_amount,
        slip_image,
        status
    ) VALUES (
        p_branch_id,
        p_customer_id,
        v_receipt_no,
        v_subtotal,
        p_discount,
        v_grand_total,
        p_payment_method,
        p_cash_received,
        p_change_amount,
        p_slip_image,
        'COMPLETED'
    )
    RETURNING id INTO v_order_id;
    
    -- 5) Create order_items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'qty')::NUMERIC;
        v_price := (v_item->>'price')::NUMERIC;
        v_cost := COALESCE((v_item->>'cost')::NUMERIC, 0);
        v_note := COALESCE((v_item->>'note')::TEXT, '');

        -- Insert order_item
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            cost,
            note
        ) VALUES (
            v_order_id,
            v_product_id,
            v_qty,
            v_price,
            v_cost,
            v_note
        );
        
        -- ลดสต็อก
        UPDATE inventory 
        SET quantity = quantity - v_qty
        WHERE branch_id = p_branch_id 
          AND product_id = v_product_id;
        
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
            p_branch_id,
            v_product_id,
            'SALE',
            -v_qty,
            inv.quantity,
            'ขายสินค้า ' || v_receipt_no,
            'ORDER',
            v_order_id
        FROM inventory inv
        WHERE inv.branch_id = p_branch_id 
          AND inv.product_id = v_product_id;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'receipt_no', v_receipt_no,
        'grand_total', v_grand_total
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- เพิ่ม column cost ใน order_items ถ้ายังไม่มี
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'cost'
    ) THEN
        ALTER TABLE order_items ADD COLUMN cost NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_checkout(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, JSONB) TO anon, authenticated;
