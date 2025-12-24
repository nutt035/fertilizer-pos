'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Barcode, Plus, Save, X, Wand2, Trash2, Loader2, Printer } from 'lucide-react';
import Modal from '../common/Modal';
import BarcodeGenerator from './BarcodeGenerator';
import { useToast } from '../common/Toast';

interface BarcodeManagerProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    barcodes: string[]; // initial from DB
    onSave: (barcodes: string[]) => Promise<void>;
}

// ===== Internal Barcode (EAN-13 style) =====
function calcEan13CheckDigit(d12: string) {
    let sumOdd = 0;
    let sumEven = 0;
    for (let i = 0; i < 12; i++) {
        const n = Number(d12[i]);
        if ((i + 1) % 2 === 1) sumOdd += n;
        else sumEven += n;
    }
    const total = sumOdd + sumEven * 3;
    const mod = total % 10;
    return mod === 0 ? 0 : 10 - mod;
}

function genInternalBarcode13(prefix = '200') {
    const need = 12 - prefix.length;
    let body = '';
    for (let i = 0; i < need; i++) body += Math.floor(Math.random() * 10).toString();
    const d12 = (prefix + body).slice(0, 12);
    const cd = calcEan13CheckDigit(d12);
    return d12 + cd.toString();
}

export default function BarcodeManager({
    isOpen,
    onClose,
    productId,
    productName,
    barcodes: initialBarcodes,
    onSave
}: BarcodeManagerProps) {
    const [barcodes, setBarcodes] = useState<string[]>([]);
    const [newBarcode, setNewBarcode] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (!isOpen) return;
        setBarcodes(Array.isArray(initialBarcodes) ? initialBarcodes : []);
        setNewBarcode('');
        setSaving(false);
    }, [isOpen, initialBarcodes]);

    const hasBarcode = useMemo(() => barcodes.length > 0, [barcodes]);

    const normalize = (s: string) => s.trim();

    const tryAddBarcodeToState = (code: string) => {
        const trimmed = normalize(code);
        if (!trimmed) return { ok: false as const, reason: 'empty' as const };
        if (barcodes.includes(trimmed)) return { ok: false as const, reason: 'duplicate_in_product' as const };
        setBarcodes((prev) => [...prev, trimmed]);
        return { ok: true as const, code: trimmed };
    };

    const handleAddManual = () => {
        const res = tryAddBarcodeToState(newBarcode);
        if (!res.ok) {
            if (res.reason === 'duplicate_in_product') toast.warning('บาร์โค้ดนี้มีอยู่แล้วในสินค้านี้');
            setNewBarcode('');
            return;
        }
        setNewBarcode('');
    };

    const handleRemove = (code: string) => {
        setBarcodes((prev) => prev.filter((b) => b !== code));
    };

    // ✅ กด “สร้าง” ครั้งเดียว = เพิ่ม + เซฟ + ปิด
    const handleGenerateAndSave = async () => {
        if (saving) return;

        let code = '';
        let guard = 0;
        do {
            code = genInternalBarcode13('200'); // prefix ร้าน
            guard++;
            if (guard > 50) {
                toast.error('สร้างบาร์โค้ดไม่สำเร็จ ลองอีกครั้ง');
                return;
            }
        } while (barcodes.includes(code));

        const next = [...barcodes, code];
        setBarcodes(next);

        try {
            setSaving(true);
            await onSave(next);
            onClose();
        } catch (err: any) {
            setBarcodes((prev) => prev.filter((b) => b !== code));
            toast.error(err?.message || 'บันทึกบาร์โค้ดไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveManual = async () => {
        if (saving) return;
        try {
            setSaving(true);
            await onSave(barcodes);
            onClose();
        } catch (err: any) {
            toast.error(err?.message || 'บันทึกไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    };

    // ✅ พิมพ์สติ๊กเกอร์ (เลือก 1 โค้ด)
    const printOne = (code: string) => {
        const w = window.open('', '_blank', 'width=420,height=600');
        if (!w) return;

        // ใช้วิธีจับ SVG ที่ react-barcode วาดไว้แล้วจาก DOM ในหน้าปัจจุบัน
        // เราจะ render barcode แบบซ่อนสำหรับคัดลอก SVG
        const el = document.getElementById(`barcode-svg-${code}`);
        const svg = el?.querySelector('svg')?.outerHTML;

        if (!svg) {
            toast.warning('ยังสร้างภาพบาร์โค้ดไม่ทัน ลองใหม่อีกครั้ง');
            return;
        }

        w.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            @media print { body { margin: 0; } }
            body { font-family: sans-serif; padding: 16px; }
            .label { border: 1px dashed #ddd; padding: 12px; border-radius: 12px; width: 360px; }
            .name { font-weight: 800; font-size: 14px; margin-bottom: 8px; }
            .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; margin-top: 8px; color: #444; }
            .hint { font-size: 11px; color: #888; margin-top: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label">
            <div class="name">${(productName || '').replace(/</g, '&lt;')}</div>
            ${svg}
            <div class="code">${code}</div>
            <div class="hint">แนะนำ: พิมพ์ 100% (ไม่ย่อ/ไม่ขยาย) เพื่อสแกนง่าย</div>
          </div>
        </body>
      </html>
    `);
        w.document.close();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => (saving ? null : onClose())}
            title="จัดการบาร์โค้ด"
            headerColor="bg-indigo-600"
            size="lg"
            footer={
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-3 rounded-lg border font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        <X size={18} /> ปิด
                    </button>

                    <button
                        onClick={handleSaveManual}
                        disabled={saving}
                        className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                        title="บันทึก (สำรอง)"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        บันทึก
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <div className="text-sm text-indigo-700 font-bold flex items-center gap-2">
                        <Barcode size={16} /> {productName || 'สินค้า'} ({productId})
                    </div>
                    <div className="text-xs text-indigo-500 mt-1">
                        สถานะ: {hasBarcode ? `มีแล้ว ${barcodes.length} อัน` : 'ยังไม่มีบาร์โค้ด'}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleGenerateAndSave}
                    disabled={saving}
                    className="w-full px-4 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-lg flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60"
                >
                    {saving ? <Loader2 className="animate-spin" size={22} /> : <Wand2 size={22} />}
                    สร้างบาร์โค้ด (เซฟทันที)
                </button>

                <div className="flex gap-2">
                    <input
                        value={newBarcode}
                        onChange={(e) => setNewBarcode(e.target.value)}
                        placeholder="เพิ่มบาร์โค้ดเอง (ถ้าต้องการ)"
                        className="flex-1 border rounded-lg px-3 py-3 font-mono"
                        disabled={saving}
                    />
                    <button
                        type="button"
                        onClick={handleAddManual}
                        disabled={saving}
                        className="px-4 py-3 rounded-lg bg-gray-900 text-white font-bold flex items-center gap-2 disabled:opacity-60"
                    >
                        <Plus size={18} /> เพิ่ม
                    </button>
                </div>

                <div className="space-y-3">
                    {barcodes.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            ยังไม่มีบาร์โค้ด กด “สร้างบาร์โค้ด (เซฟทันที)” ได้เลย
                        </div>
                    ) : (
                        barcodes.map((code) => (
                            <div key={code} className="border rounded-xl p-3 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-mono text-lg font-bold">{code}</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => printOne(code)}
                                            disabled={saving}
                                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 flex items-center gap-2 disabled:opacity-60"
                                            title="พิมพ์สติ๊กเกอร์"
                                        >
                                            <Printer size={16} /> พิมพ์
                                        </button>
                                        <button
                                            onClick={() => handleRemove(code)}
                                            disabled={saving}
                                            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 flex items-center gap-2 disabled:opacity-60"
                                            title="ลบจากรายการ (อย่าลืมกดบันทึกถ้าเพิ่มเองหลายอัน)"
                                        >
                                            <Trash2 size={16} /> ลบ
                                        </button>
                                    </div>
                                </div>

                                {/* ✅ โชว์รูปบาร์โค้ด */}
                                <div className="bg-white rounded-lg border p-2">
                                    <BarcodeGenerator value={code} format="CODE128" />
                                </div>

                                {/* ✅ hidden copy source for printing */}
                                <div id={`barcode-svg-${code}`} className="hidden">
                                    <BarcodeGenerator value={code} format="CODE128" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}
