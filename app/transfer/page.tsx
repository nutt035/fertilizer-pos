'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { ArrowRightLeft, Package, Search, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

type Branch = {
    id: string;
    name: string;
    code?: string | null;
};

type ProductRow = {
    id: string;
    name: string;
    stock: number;
};

type Notice = { type: 'success' | 'error' | 'warn'; message: string } | null;

export default function TransferPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<ProductRow[]>([]);

    const [targetBranch, setTargetBranch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState<string>('1');

    const [branchQuery, setBranchQuery] = useState('');
    const [productQuery, setProductQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [notice, setNotice] = useState<Notice>(null);

    const reloadProducts = async () => {
        const { data: p, error } = await supabase
            .from('products')
            .select('id, name, inventory(quantity)')
            .eq('inventory.branch_id', CURRENT_BRANCH_ID);

        if (error) {
            setNotice({ type: 'error', message: `โหลดสินค้าล้มเหลว: ${error.message}` });
            return;
        }

        const mapped =
            p?.map((i: any) => ({
                id: String(i.id),
                name: String(i.name ?? ''),
                stock: Number(i.inventory?.[0]?.quantity ?? 0),
            })) ?? [];

        setProducts(mapped);
    };

    useEffect(() => {
        const initData = async () => {
            setInitialLoading(true);
            setNotice(null);

            const [{ data: b, error: bErr }] = await Promise.all([
                supabase.from('branches').select('*').neq('id', CURRENT_BRANCH_ID),
            ]);

            if (bErr) {
                setNotice({ type: 'error', message: `โหลดสาขาล้มเหลว: ${bErr.message}` });
            } else {
                setBranches((b as any[])?.map((x) => ({ id: String(x.id), name: x.name, code: x.code })) ?? []);
            }

            await reloadProducts();
            setInitialLoading(false);
        };

        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedBranchObj = useMemo(
        () => branches.find((b) => String(b.id) === String(targetBranch)),
        [branches, targetBranch]
    );

    const selectedProductObj = useMemo(
        () => products.find((p) => String(p.id) === String(selectedProduct)),
        [products, selectedProduct]
    );

    const qtyNum = useMemo(() => {
        const n = Number(qty);
        return Number.isFinite(n) ? n : 0;
    }, [qty]);

    const filteredBranches = useMemo(() => {
        const q = branchQuery.trim().toLowerCase();
        if (!q) return branches;
        return branches.filter((b) => {
            const name = (b.name ?? '').toLowerCase();
            const code = (b.code ?? '').toLowerCase();
            return name.includes(q) || code.includes(q);
        });
    }, [branches, branchQuery]);

    const filteredProducts = useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) => (p.name ?? '').toLowerCase().includes(q));
    }, [products, productQuery]);

    const qtyError = useMemo(() => {
        if (!selectedProductObj) return null;
        if (!qty || qty.trim() === '') return 'กรอกจำนวนที่จะโอน';
        if (!Number.isInteger(qtyNum) || qtyNum <= 0) return 'จำนวนต้องเป็นเลขจำนวนเต็มมากกว่า 0';
        if (qtyNum > selectedProductObj.stock) return `โอนเกินคงเหลือ (คงเหลือ ${selectedProductObj.stock})`;
        return null;
    }, [qty, qtyNum, selectedProductObj]);

    const canSubmit = useMemo(() => {
        return Boolean(targetBranch && selectedProduct && !qtyError && !loading && !initialLoading);
    }, [targetBranch, selectedProduct, qtyError, loading, initialLoading]);

    const handleTransfer = async () => {
        setNotice(null);

        if (!targetBranch || !selectedProduct) {
            setNotice({ type: 'warn', message: 'เลือกสาขาปลายทางและสินค้าให้ครบ' });
            return;
        }
        if (qtyError) {
            setNotice({ type: 'warn', message: qtyError });
            return;
        }

        const branchLabel = selectedBranchObj ? `${selectedBranchObj.name}${selectedBranchObj.code ? ` (${selectedBranchObj.code})` : ''}` : '';
        const productLabel = selectedProductObj ? `${selectedProductObj.name} (คงเหลือ ${selectedProductObj.stock})` : '';

        const ok = window.confirm(
            `ยืนยันโอนสินค้า?\n\nไปสาขา: ${branchLabel}\nสินค้า: ${productLabel}\nจำนวน: ${qtyNum}`
        );
        if (!ok) return;

        setLoading(true);

        const { data, error } = await supabase.rpc('process_transfer', {
            p_from_branch: CURRENT_BRANCH_ID,
            p_to_branch: targetBranch,
            p_product_id: selectedProduct,
            p_qty: qtyNum,
            p_note: 'โอนผ่านระบบ',
        });

        if (error || !data?.success) {
            setNotice({ type: 'error', message: `โอนล้มเหลว: ${error?.message || data?.message || 'ไม่ทราบสาเหตุ'}` });
            setLoading(false);
            return;
        }

        setNotice({ type: 'success', message: '✅ โอนย้ายสำเร็จ!' });
        setQty('1');
        await reloadProducts();
        setLoading(false);
    };

    const quickSetQty = (value: number) => {
        setNotice(null);
        setQty(String(value));
    };

    const addQty = (delta: number) => {
        setNotice(null);
        const next = Math.max(1, (Number.isFinite(qtyNum) ? qtyNum : 1) + delta);
        setQty(String(next));
    };

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
            <div className="mb-4 md:mb-6 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <ArrowRightLeft className="shrink-0" /> โอนย้ายสินค้าข้ามสาขา
                    </h1>
                    <div className="text-sm text-gray-500 mt-1">
                        เลือกสาขาปลายทาง → เลือกสินค้า → ใส่จำนวน → ยืนยัน
                    </div>
                </div>
            </div>

            {notice && (
                <div
                    className={[
                        'mb-4 rounded-xl border p-3 text-sm flex items-start gap-2',
                        notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : '',
                        notice.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : '',
                        notice.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : '',
                    ].join(' ')}
                >
                    {notice.type === 'success' && <CheckCircle2 className="mt-0.5" size={18} />}
                    {notice.type !== 'success' && <AlertTriangle className="mt-0.5" size={18} />}
                    <div className="flex-1">{notice.message}</div>
                    <button className="text-xs opacity-70 hover:opacity-100" onClick={() => setNotice(null)}>
                        ปิด
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Branch */}
                    <div className="space-y-2">
                        <label className="block font-bold">สาขาปลายทาง</label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                value={branchQuery}
                                onChange={(e) => setBranchQuery(e.target.value)}
                                placeholder="ค้นหาสาขา (ชื่อ/โค้ด)"
                                className="w-full border rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-blue-200"
                                disabled={initialLoading}
                            />
                        </div>

                        <select
                            className="w-full border p-3 rounded-xl"
                            value={targetBranch}
                            onChange={(e) => setTargetBranch(e.target.value)}
                            disabled={initialLoading}
                        >
                            <option value="">-- เลือกสาขา --</option>
                            {filteredBranches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name} {b.code ? `(${b.code})` : ''}
                                </option>
                            ))}
                        </select>

                        {selectedBranchObj && (
                            <div className="text-xs text-gray-500">
                                เลือกแล้ว: <span className="font-semibold text-gray-700">{selectedBranchObj.name}</span>
                                {selectedBranchObj.code ? ` (${selectedBranchObj.code})` : ''}
                            </div>
                        )}
                    </div>

                    {/* Product */}
                    <div className="space-y-2">
                        <label className="block font-bold">สินค้า (จากสาขานี้)</label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                value={productQuery}
                                onChange={(e) => setProductQuery(e.target.value)}
                                placeholder="ค้นหาสินค้า"
                                className="w-full border rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-blue-200"
                                disabled={initialLoading}
                            />
                        </div>

                        <select
                            className="w-full border p-3 rounded-xl"
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setNotice(null);
                            }}
                            disabled={initialLoading}
                        >
                            <option value="">-- เลือกสินค้า --</option>
                            {filteredProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (คงเหลือ: {p.stock})
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Package size={16} />
                            {selectedProductObj ? (
                                <>
                                    คงเหลือ <span className="font-semibold text-gray-700">{selectedProductObj.stock}</span>
                                </>
                            ) : (
                                <>เลือกสินค้าเพื่อดูคงเหลือ</>
                            )}
                        </div>
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="block font-bold">จำนวนที่โอน</label>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
                            <div className="space-y-2">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className={[
                                        'w-full border p-4 rounded-xl text-xl font-bold outline-none',
                                        qtyError ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'focus:ring-2 focus:ring-blue-200',
                                    ].join(' ')}
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    placeholder="0"
                                    disabled={initialLoading}
                                />

                                {qtyError ? (
                                    <div className="text-sm text-red-600 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        {qtyError}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-500">ทิป: ใช้ปุ่ม + / - เพื่อปรับเร็ว ๆ ได้</div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                                        onClick={() => addQty(-1)}
                                        disabled={initialLoading}
                                    >
                                        -1
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                                        onClick={() => addQty(1)}
                                        disabled={initialLoading}
                                    >
                                        +1
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                                        onClick={() => addQty(5)}
                                        disabled={initialLoading}
                                    >
                                        +5
                                    </button>
                                    {selectedProductObj && (
                                        <button
                                            type="button"
                                            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                                            onClick={() => quickSetQty(selectedProductObj.stock)}
                                            disabled={initialLoading}
                                            title="ตั้งเท่ากับคงเหลือ"
                                        >
                                            โอนทั้งหมด
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="rounded-2xl border bg-gray-50 p-4 md:min-w-[280px]">
                                <div className="font-bold mb-2">สรุปการโอน</div>
                                <div className="text-sm text-gray-700 space-y-1">
                                    <div>
                                        ไปสาขา:{' '}
                                        <span className="font-semibold">
                                            {selectedBranchObj ? `${selectedBranchObj.name}${selectedBranchObj.code ? ` (${selectedBranchObj.code})` : ''}` : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        สินค้า:{' '}
                                        <span className="font-semibold">
                                            {selectedProductObj ? selectedProductObj.name : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        จำนวน:{' '}
                                        <span className="font-semibold">
                                            {qty && !Number.isNaN(qtyNum) ? qtyNum : '-'}
                                        </span>
                                    </div>
                                </div>

                                {selectedProductObj && Number.isInteger(qtyNum) && qtyNum > 0 && (
                                    <div className="mt-3 text-xs text-gray-500">
                                        หลังโอนคงเหลือประมาณ: <span className="font-semibold text-gray-700">{Math.max(0, selectedProductObj.stock - qtyNum)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t bg-white">
                    <button
                        onClick={handleTransfer}
                        disabled={!canSubmit}
                        className="w-full rounded-2xl font-bold py-4 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} /> กำลังประมวลผล...
                            </>
                        ) : initialLoading ? (
                            'กำลังโหลดข้อมูล...'
                        ) : (
                            'ยืนยันการโอน'
                        )}
                    </button>
                </div>
            </div>

            {initialLoading && (
                <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    กำลังโหลดสาขาและสินค้า...
                </div>
            )}
        </div>
    );
}
