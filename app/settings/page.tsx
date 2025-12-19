'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import {
    Settings,
    Save,
    MapPin,
    FileText,
    Layers,
    Tag,
    Trash2,
    Plus,
    Store,
    Search,
    RefreshCcw,
    CheckCircle2,
    AlertTriangle,
    Pencil,
    X,
} from 'lucide-react';

type Notice = { type: 'success' | 'error' | 'warn'; message: string } | null;

type BranchRow = {
    id: string;
    name: string | null;
    code?: string | null;
    address?: string | null;
    phone?: string | null;
    tax_id?: string | null;
    receipt_header?: string | null;
    receipt_footer?: string | null;
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'BRANCH' | 'CATEGORY' | 'UNIT'>('BRANCH');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);

    // --- Branch (current editable) State ---
    const [branch, setBranch] = useState({
        name: '',
        address: '',
        phone: '',
        tax_id: '',
        receipt_header: '',
        receipt_footer: '',
    });

    // --- Branch management list ---
    const [allBranches, setAllBranches] = useState<BranchRow[]>([]);
    const [branchSearch, setBranchSearch] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState<string>(CURRENT_BRANCH_ID);

    // --- Add new branch form ---
    const [newBranch, setNewBranch] = useState({
        name: '',
        code: '',
        phone: '',
        address: '',
    });

    // --- Master Data State ---
    const [categories, setCategories] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        fetchAllBranches();
        fetchBranchInfo(CURRENT_BRANCH_ID);
        fetchMasterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAllBranches = async () => {
        setNotice(null);
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            setNotice({ type: 'error', message: `โหลดรายการสาขาไม่สำเร็จ: ${error.message}` });
            return;
        }
        setAllBranches((data as any[])?.map((b) => ({ ...b, id: String(b.id) })) ?? []);
    };

    const fetchBranchInfo = async (branchId: string) => {
        setNotice(null);
        const { data, error } = await supabase.from('branches').select('*').eq('id', branchId).single();
        if (error) {
            setNotice({ type: 'error', message: `โหลดข้อมูลสาขาไม่สำเร็จ: ${error.message}` });
            return;
        }
        if (data) {
            setSelectedBranchId(String(data.id));
            setBranch({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                tax_id: data.tax_id || '',
                receipt_header: data.receipt_header || '',
                receipt_footer: data.receipt_footer || '',
            });
        }
    };

    const fetchMasterData = async () => {
        const { data: cats } = await supabase.from('master_categories').select('*').order('name');
        const { data: uns } = await supabase.from('master_units').select('*').order('name');
        setCategories(cats || []);
        setUnits(uns || []);
    };

    const handleSaveBranch = async () => {
        setLoading(true);
        setNotice(null);

        const { error } = await supabase.from('branches').update(branch).eq('id', selectedBranchId);

        if (error) setNotice({ type: 'error', message: `บันทึกไม่สำเร็จ: ${error.message}` });
        else {
            setNotice({ type: 'success', message: '✅ บันทึกข้อมูลสาขาเรียบร้อย' });
            await fetchAllBranches();
        }
        setLoading(false);
    };

    const handleAddBranch = async () => {
        setNotice(null);

        const name = newBranch.name.trim();
        const code = newBranch.code.trim();
        const phone = newBranch.phone.trim();
        const address = newBranch.address.trim();

        if (!name) return setNotice({ type: 'warn', message: 'กรุณากรอกชื่อสาขา' });
        // code optional แต่แนะนำให้มี
        if (!code) return setNotice({ type: 'warn', message: 'กรุณากรอกรหัสสาขา (เช่น BR01)' });

        setLoading(true);

        const { error } = await supabase.from('branches').insert({
            name,
            code,
            phone: phone || null,
            address: address || null,
        });

        if (error) {
            setNotice({ type: 'error', message: `เพิ่มสาขาไม่สำเร็จ: ${error.message}` });
            setLoading(false);
            return;
        }

        setNotice({ type: 'success', message: '✅ เพิ่มสาขาใหม่เรียบร้อย' });
        setNewBranch({ name: '', code: '', phone: '', address: '' });
        await fetchAllBranches();
        setLoading(false);
    };

    const handleDeleteBranch = async (branchId: string) => {
        setNotice(null);
        const id = String(branchId);

        if (id === String(CURRENT_BRANCH_ID)) {
            return setNotice({ type: 'warn', message: 'ลบสาขาที่กำลังใช้งานอยู่ไม่ได้' });
        }

        const b = allBranches.find((x) => String(x.id) === id);
        const label = b?.name ? `${b.name}${b.code ? ` (${b.code})` : ''}` : id;

        if (!confirm(`ต้องการลบสาขา "${label}" ?\n\n⚠️ ถ้ามีสต็อก/ออเดอร์ผูกอยู่ อาจลบไม่ผ่านหรือทำให้ข้อมูลเพี้ยน`)) return;

        setLoading(true);
        const { error } = await supabase.from('branches').delete().eq('id', id);

        if (error) setNotice({ type: 'error', message: `ลบไม่สำเร็จ: ${error.message}` });
        else {
            setNotice({ type: 'success', message: '🗑️ ลบสาขาเรียบร้อย' });

            // ถ้าลบสาขาที่กำลังแก้ไขอยู่ ให้กลับไปสาขาปัจจุบัน
            if (selectedBranchId === id) {
                await fetchBranchInfo(CURRENT_BRANCH_ID);
            }

            await fetchAllBranches();
        }
        setLoading(false);
    };

    const handleAddItem = async (type: 'CATEGORY' | 'UNIT') => {
        setNotice(null);
        if (!newItemName.trim()) return;
        const table = type === 'CATEGORY' ? 'master_categories' : 'master_units';

        const { error } = await supabase.from(table).insert({ name: newItemName.trim() });
        if (error) {
            setNotice({ type: 'error', message: `เพิ่มไม่สำเร็จ (ชื่ออาจซ้ำ): ${error.message}` });
        } else {
            setNewItemName('');
            setNotice({ type: 'success', message: '✅ เพิ่มรายการเรียบร้อย' });
            fetchMasterData();
        }
    };

    const handleDeleteItem = async (type: 'CATEGORY' | 'UNIT', id: string) => {
        setNotice(null);
        if (!confirm('ต้องการลบรายการนี้? (ถ้ามีสินค้าใช้อยู่อาจมีปัญหาแสดงผล)')) return;
        const table = type === 'CATEGORY' ? 'master_categories' : 'master_units';
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) setNotice({ type: 'error', message: `ลบไม่สำเร็จ: ${error.message}` });
        else {
            setNotice({ type: 'success', message: '🗑️ ลบรายการเรียบร้อย' });
            fetchMasterData();
        }
    };

    const filteredBranches = useMemo(() => {
        const q = branchSearch.trim().toLowerCase();
        if (!q) return allBranches;
        return allBranches.filter((b) => {
            const name = (b.name ?? '').toLowerCase();
            const code = (b.code ?? '').toLowerCase();
            return name.includes(q) || code.includes(q);
        });
    }, [allBranches, branchSearch]);

    const selectedBranchLabel = useMemo(() => {
        const b = allBranches.find((x) => String(x.id) === String(selectedBranchId));
        if (!b) return selectedBranchId === CURRENT_BRANCH_ID ? 'สาขาปัจจุบัน' : 'สาขา';
        return `${b.name ?? 'ไม่ระบุชื่อ'}${b.code ? ` (${b.code})` : ''}`;
    }, [allBranches, selectedBranchId]);

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto font-sans min-h-screen bg-gray-50/50">
            <h1 className="text-2xl font-black mb-4 flex items-center gap-2 text-slate-800">
                <Settings className="text-blue-600" /> ตั้งค่าระบบ
            </h1>

            {notice && (
                <div
                    className={[
                        'mb-4 rounded-xl border p-3 text-sm flex items-start gap-2',
                        notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : '',
                        notice.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : '',
                        notice.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : '',
                    ].join(' ')}
                >
                    {notice.type === 'success' ? <CheckCircle2 className="mt-0.5" size={18} /> : <AlertTriangle className="mt-0.5" size={18} />}
                    <div className="flex-1">{notice.message}</div>
                    <button className="opacity-70 hover:opacity-100" onClick={() => setNotice(null)} title="ปิด">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Tabs Menu */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('BRANCH')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'BRANCH' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Store size={18} /> ข้อมูลร้าน & สาขา
                </button>
                <button
                    onClick={() => setActiveTab('CATEGORY')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'CATEGORY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Layers size={18} /> หมวดหมู่สินค้า
                </button>
                <button
                    onClick={() => setActiveTab('UNIT')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'UNIT' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Tag size={18} /> หน่วยนับ
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                {/* --- Tab 1: Branch Settings + Branch Management --- */}
                {activeTab === 'BRANCH' && (
                    <div className="space-y-8">
                        {/* Branch Management */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Store size={18} /> จัดการสาขา
                                </h2>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={fetchAllBranches}
                                        className="px-3 py-2 rounded-xl border hover:bg-gray-50 flex items-center gap-2 text-sm font-bold"
                                        disabled={loading}
                                    >
                                        <RefreshCcw size={16} /> รีเฟรช
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* List */}
                                <div className="rounded-2xl border bg-gray-50 p-4">
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            value={branchSearch}
                                            onChange={(e) => setBranchSearch(e.target.value)}
                                            placeholder="ค้นหาสาขา (ชื่อ/โค้ด)"
                                            className="w-full border rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                        {filteredBranches.map((b) => {
                                            const isCurrent = String(b.id) === String(CURRENT_BRANCH_ID);
                                            const isSelected = String(b.id) === String(selectedBranchId);

                                            return (
                                                <div
                                                    key={b.id}
                                                    className={[
                                                        'flex items-center justify-between gap-2 p-3 rounded-xl border transition',
                                                        isSelected ? 'bg-white border-blue-200 shadow-sm' : 'bg-white/60 hover:bg-white hover:shadow-sm',
                                                    ].join(' ')}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-800 truncate">
                                                            {b.name || '(ไม่ระบุชื่อ)'}{' '}
                                                            {b.code ? <span className="text-xs text-gray-500">({b.code})</span> : null}
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate">
                                                            {isCurrent ? '🟦 สาขาปัจจุบัน' : ' '}
                                                            {b.phone ? ` • ${b.phone}` : ''}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => fetchBranchInfo(String(b.id))}
                                                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                                                            title="แก้ไขสาขานี้"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBranch(String(b.id))}
                                                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40"
                                                            title={isCurrent ? 'ลบสาขาปัจจุบันไม่ได้' : 'ลบสาขานี้'}
                                                            disabled={isCurrent || loading}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {filteredBranches.length === 0 && <div className="text-center text-gray-400 py-10">ไม่พบสาขา</div>}
                                    </div>
                                </div>

                                {/* Add branch */}
                                <div className="rounded-2xl border p-4">
                                    <div className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                        <Plus size={18} /> เพิ่มสาขาใหม่
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-bold text-gray-600">ชื่อสาขา</label>
                                            <input
                                                type="text"
                                                className="w-full border p-3 rounded-xl"
                                                value={newBranch.name}
                                                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                                placeholder="เช่น สาขาในเมือง"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-gray-600">รหัสสาขา</label>
                                            <input
                                                type="text"
                                                className="w-full border p-3 rounded-xl"
                                                value={newBranch.code}
                                                onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                                                placeholder="เช่น BR01"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-gray-600">โทรศัพท์</label>
                                            <input
                                                type="text"
                                                className="w-full border p-3 rounded-xl"
                                                value={newBranch.phone}
                                                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                                                placeholder="(ไม่บังคับ)"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-sm font-bold text-gray-600">ที่อยู่</label>
                                            <textarea
                                                rows={2}
                                                className="w-full border p-3 rounded-xl"
                                                value={newBranch.address}
                                                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                                                placeholder="(ไม่บังคับ)"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-3">
                                        <button
                                            onClick={handleAddBranch}
                                            disabled={loading}
                                            className="bg-green-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400"
                                        >
                                            <Plus size={18} /> เพิ่มสาขา
                                        </button>
                                    </div>

                                    <div className="mt-3 text-xs text-gray-500">
                                        * ถ้าเพิ่มไม่ผ่าน ให้ดูว่ามี RLS policy อนุญาต insert ที่ตาราง <span className="font-semibold">branches</span> หรือยัง
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Branch Settings (selected branch) */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2">
                                <MapPin size={18} /> ข้อมูลสาขาที่กำลังแก้ไข: <span className="text-gray-900">{selectedBranchLabel}</span>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-600">ชื่อร้าน/สาขา</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded-lg"
                                        value={branch.name}
                                        onChange={(e) => setBranch({ ...branch, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-600">โทรศัพท์</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded-lg"
                                        value={branch.phone}
                                        onChange={(e) => setBranch({ ...branch, phone: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-bold text-gray-600">ที่อยู่</label>
                                    <textarea
                                        rows={2}
                                        className="w-full border p-2 rounded-lg"
                                        value={branch.address}
                                        onChange={(e) => setBranch({ ...branch, address: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-bold text-gray-600">เลขผู้เสียภาษี</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded-lg"
                                        value={branch.tax_id}
                                        onChange={(e) => setBranch({ ...branch, tax_id: e.target.value })}
                                        placeholder="(ไม่บังคับ)"
                                    />
                                </div>
                            </div>

                            <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2 pt-4">
                                <FileText size={18} /> ข้อความใบเสร็จ
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-600">Header (ใต้ชื่อร้าน)</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded-lg"
                                        value={branch.receipt_header}
                                        onChange={(e) => setBranch({ ...branch, receipt_header: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-600">Footer (ล่างสุด)</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded-lg"
                                        value={branch.receipt_footer}
                                        onChange={(e) => setBranch({ ...branch, receipt_footer: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-2">
                                <button
                                    onClick={() => fetchBranchInfo(CURRENT_BRANCH_ID)}
                                    className="bg-white border px-5 py-3 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2"
                                    type="button"
                                >
                                    <Store size={18} /> กลับไปสาขาปัจจุบัน
                                </button>

                                <button
                                    onClick={handleSaveBranch}
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg disabled:bg-gray-400"
                                >
                                    <Save size={20} /> บันทึกข้อมูลสาขา
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Tab 2 & 3: Categories & Units --- */}
                {(activeTab === 'CATEGORY' || activeTab === 'UNIT') && (
                    <div className="max-w-xl">
                        <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2 mb-4">
                            {activeTab === 'CATEGORY' ? (
                                <>
                                    <Layers /> จัดการหมวดหมู่สินค้า
                                </>
                            ) : (
                                <>
                                    <Tag /> จัดการหน่วยนับ
                                </>
                            )}
                        </h2>

                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder={activeTab === 'CATEGORY' ? 'ชื่อหมวดหมู่ใหม่...' : 'ชื่อหน่วยนับใหม่...'}
                                className="flex-1 border-2 border-blue-100 p-3 rounded-xl focus:border-blue-500 outline-none"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(activeTab)}
                            />
                            <button
                                onClick={() => handleAddItem(activeTab)}
                                className="bg-green-600 text-white px-4 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2"
                            >
                                <Plus /> เพิ่ม
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {(activeTab === 'CATEGORY' ? categories : units).map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:bg-white hover:shadow-sm transition"
                                >
                                    <span className="font-bold text-gray-700">{item.name}</span>
                                    <button
                                        onClick={() => handleDeleteItem(activeTab, item.id)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {(activeTab === 'CATEGORY' ? categories : units).length === 0 && (
                                <div className="text-center text-gray-400 py-8">ยังไม่มีข้อมูล</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
