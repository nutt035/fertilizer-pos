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
    const [activeTab, setActiveTab] = useState<'BRANCH' | 'CATEGORY' | 'SUBCATEGORY' | 'UNIT'>('BRANCH');
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
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newSubcategoryParent, setNewSubcategoryParent] = useState<string>('');

    // State for sub-category
    const [newParentId, setNewParentId] = useState<string | null>(null);

    // State for collapsible subcategory groups
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategoryExpand = (catId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) {
                next.delete(catId);
            } else {
                next.add(catId);
            }
            return next;
        });
    };

    // State for drag-drop
    const [draggedId, setDraggedId] = useState<string | null>(null);

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
        // เรียงหมวดหมู่ตาม sort_order
        const { data: cats } = await supabase.from('master_categories').select('*').order('sort_order');
        const { data: subs } = await supabase.from('master_subcategories').select('*').order('name');
        const { data: uns } = await supabase.from('master_units').select('*').order('name');
        setCategories(cats || []);
        setSubcategories(subs || []);
        setUnits(uns || []);
    };

    // Drag-drop handlers for category reordering
    const handleDragStart = (id: string) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (targetId: string) => {
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            return;
        }

        // Find indices
        const draggedIndex = categories.findIndex(c => c.id === draggedId);
        const targetIndex = categories.findIndex(c => c.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedId(null);
            return;
        }

        // Reorder locally first for instant feedback
        const newCategories = [...categories];
        const [dragged] = newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, dragged);
        setCategories(newCategories);

        // Update sort_order in database
        const updates = newCategories.map((cat, index) => ({
            id: cat.id,
            sort_order: index + 1
        }));

        for (const update of updates) {
            await supabase.from('master_categories').update({ sort_order: update.sort_order }).eq('id', update.id);
        }

        setDraggedId(null);
        setNotice({ type: 'success', message: '✅ จัดลำดับเรียบร้อย' });
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

        // Category specific - include parent_id and sort_order
        if (type === 'CATEGORY') {
            const maxSortOrder = Math.max(...categories.map(c => c.sort_order || 0), 0);
            const { error } = await supabase.from(table).insert({
                name: newItemName.trim(),
                parent_id: newParentId || null,
                sort_order: maxSortOrder + 1
            });
            if (error) {
                setNotice({ type: 'error', message: `เพิ่มไม่สำเร็จ (ชื่ออาจซ้ำ): ${error.message}` });
            } else {
                setNewItemName('');
                setNewParentId(null);
                setNotice({ type: 'success', message: '✅ เพิ่มหมวดหมู่เรียบร้อย' });
                fetchMasterData();
            }
        } else {
            const { error } = await supabase.from(table).insert({ name: newItemName.trim() });
            if (error) {
                setNotice({ type: 'error', message: `เพิ่มไม่สำเร็จ (ชื่ออาจซ้ำ): ${error.message}` });
            } else {
                setNewItemName('');
                setNotice({ type: 'success', message: '✅ เพิ่มรายการเรียบร้อย' });
                fetchMasterData();
            }
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

    // จัดการหมวดหมู่ย่อย (Subcategory)
    const handleAddSubcategory = async () => {
        setNotice(null);
        if (!newItemName.trim()) return setNotice({ type: 'warn', message: 'กรุณากรอกชื่อหมวดหมู่ย่อย' });
        if (!newSubcategoryParent) return setNotice({ type: 'warn', message: 'กรุณาเลือกหมวดหมู่หลัก' });

        const { error } = await supabase.from('master_subcategories').insert({
            name: newItemName.trim(),
            category_id: newSubcategoryParent
        });

        if (error) {
            setNotice({ type: 'error', message: `เพิ่มไม่สำเร็จ: ${error.message}` });
        } else {
            setNewItemName('');
            setNotice({ type: 'success', message: '✅ เพิ่มหมวดหมู่ย่อยเรียบร้อย' });
            fetchMasterData();
        }
    };

    const handleDeleteSubcategory = async (id: string) => {
        setNotice(null);
        if (!confirm('ต้องการลบหมวดหมู่ย่อยนี้?')) return;
        const { error } = await supabase.from('master_subcategories').delete().eq('id', id);
        if (error) setNotice({ type: 'error', message: `ลบไม่สำเร็จ: ${error.message}` });
        else {
            setNotice({ type: 'success', message: '🗑️ ลบหมวดหมู่ย่อยเรียบร้อย' });
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
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setActiveTab('BRANCH')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'BRANCH' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Store size={18} /> ข้อมูลร้าน & สาขา
                </button>
                <button
                    onClick={() => setActiveTab('CATEGORY')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'CATEGORY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Layers size={18} /> หมวดหมู่หลัก
                </button>
                <button
                    onClick={() => setActiveTab('SUBCATEGORY')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'SUBCATEGORY' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Layers size={18} /> หมวดหมู่ย่อย
                </button>
                <button
                    onClick={() => setActiveTab('UNIT')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'UNIT' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'
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
                    <div className="max-w-2xl">
                        <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2 mb-4">
                            {activeTab === 'CATEGORY' ? (
                                <>
                                    <Layers /> จัดการหมวดหมู่สินค้า
                                    <span className="ml-2 text-xs font-normal text-gray-400">
                                        (ลากเพื่อจัดลำดับ)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Tag /> จัดการหน่วยนับ
                                </>
                            )}
                        </h2>

                        {/* Add new item */}
                        <div className="flex flex-col gap-2 mb-6 bg-gray-50 p-4 rounded-xl border">
                            <div className="flex gap-2">
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
                        </div>

                        {/* Category list with drag-drop */}
                        {activeTab === 'CATEGORY' && (
                            <div className="space-y-1 max-h-[500px] overflow-y-auto">
                                {/* Parent categories */}
                                {categories.filter(c => !c.parent_id).map((parent) => (
                                    <div key={parent.id}>
                                        {/* Parent item */}
                                        <div
                                            draggable
                                            onDragStart={() => handleDragStart(parent.id)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(parent.id)}
                                            className={`flex justify-between items-center p-3 rounded-lg border transition cursor-move ${draggedId === parent.id
                                                ? 'bg-blue-100 border-blue-300 opacity-50'
                                                : 'bg-white hover:bg-gray-50 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 cursor-grab">⋮⋮</span>
                                                <span className="font-bold text-gray-700">{parent.name}</span>
                                                {categories.filter(c => c.parent_id === parent.id).length > 0 && (
                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                                        {categories.filter(c => c.parent_id === parent.id).length} ย่อย
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteItem('CATEGORY', parent.id)}
                                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {/* Child categories */}
                                        {categories.filter(c => c.parent_id === parent.id).map((child) => (
                                            <div
                                                key={child.id}
                                                className="flex justify-between items-center p-3 ml-6 bg-gray-50 rounded-lg border-l-4 border-blue-200 mt-1"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-300">└</span>
                                                    <span className="text-gray-600">{child.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteItem('CATEGORY', child.id)}
                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {/* Orphan categories (no parent but have parent_id pointing to non-existent) */}
                                {categories.filter(c => c.parent_id && !categories.find(p => p.id === c.parent_id)).map((orphan) => (
                                    <div
                                        key={orphan.id}
                                        className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                                    >
                                        <span className="text-gray-600">{orphan.name}</span>
                                        <button
                                            onClick={() => handleDeleteItem('CATEGORY', orphan.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}

                                {categories.length === 0 && (
                                    <div className="text-center text-gray-400 py-8">ยังไม่มีหมวดหมู่</div>
                                )}
                            </div>
                        )}

                        {/* Unit list (simple) */}
                        {activeTab === 'UNIT' && (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {units.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:bg-white hover:shadow-sm transition"
                                    >
                                        <span className="font-bold text-gray-700">{item.name}</span>
                                        <button
                                            onClick={() => handleDeleteItem('UNIT', item.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {units.length === 0 && (
                                    <div className="text-center text-gray-400 py-8">ยังไม่มีหน่วยนับ</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- Tab SUBCATEGORY: หมวดหมู่ย่อย --- */}
                {activeTab === 'SUBCATEGORY' && (
                    <div className="max-w-2xl">
                        <h2 className="text-lg font-bold border-b pb-2 text-gray-700 flex items-center gap-2 mb-4">
                            <Layers /> จัดการหมวดหมู่ย่อย
                        </h2>

                        {/* Add new subcategory */}
                        <div className="flex flex-col gap-3 mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <div className="flex gap-2">
                                <select
                                    value={newSubcategoryParent}
                                    onChange={(e) => setNewSubcategoryParent(e.target.value)}
                                    className="border-2 border-purple-100 p-3 rounded-xl bg-white min-w-[150px]"
                                >
                                    <option value="">-- เลือกหมวดหมู่หลัก --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="ชื่อหมวดหมู่ย่อยใหม่..."
                                    className="flex-1 border-2 border-purple-100 p-3 rounded-xl focus:border-purple-500 outline-none"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubcategory()}
                                />
                                <button
                                    onClick={handleAddSubcategory}
                                    className="bg-purple-600 text-white px-4 rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2"
                                >
                                    <Plus /> เพิ่ม
                                </button>
                            </div>
                            <div className="text-xs text-gray-500">
                                * หมวดหมู่ย่อยจะแสดงใน dropdown ตอนเพิ่ม/แก้ไขสินค้า (filter ตามหมวดหมู่หลักที่เลือก)
                            </div>
                        </div>

                        {/* Subcategory list grouped by category */}
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {categories.map(cat => {
                                const subs = subcategories.filter(s => s.category_id === cat.id);
                                if (subs.length === 0) return null;
                                const isExpanded = expandedCategories.has(cat.id);

                                return (
                                    <div key={cat.id} className="border rounded-xl overflow-hidden">
                                        {/* Clickable header */}
                                        <button
                                            onClick={() => toggleCategoryExpand(cat.id)}
                                            className="w-full bg-gray-100 px-4 py-3 font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-200 transition"
                                        >
                                            <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                ▼
                                            </span>
                                            <Layers size={16} /> {cat.name}
                                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full ml-auto">
                                                {subs.length} รายการ
                                            </span>
                                        </button>
                                        {/* Collapsible content */}
                                        {isExpanded && (
                                            <div className="divide-y bg-white">
                                                {subs.map(sub => (
                                                    <div key={sub.id} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                                        <span className="text-gray-700 pl-6">{sub.name}</span>
                                                        <button
                                                            onClick={() => handleDeleteSubcategory(sub.id)}
                                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {subcategories.length === 0 && (
                                <div className="text-center text-gray-400 py-8">
                                    ยังไม่มีหมวดหมู่ย่อย<br />
                                    <span className="text-sm">เพิ่มได้โดยเลือกหมวดหมู่หลักแล้วพิมพ์ชื่อด้านบน</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
