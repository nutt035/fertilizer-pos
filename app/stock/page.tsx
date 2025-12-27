'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { Plus, Package, Edit, ArrowLeft, Trash2, Image as ImageIcon, Barcode, Scissors, Settings, Layers, ArrowUpDown, DollarSign } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

// Components
import { SearchInput } from '../../components/common';

import {
    ProductModal,
    StockInModal,
    SplitModal,
    RecipeModal,
    StockDashboard,
    BarcodeManager,
    BulkAddModal,
    BulkEditModal
} from '../../components/stock';

// Types
import { StockProduct, SplitRecipe, MasterData } from '../../types';

export default function StockPage() {
    const [products, setProducts] = useState<StockProduct[]>([]);
    const [categories, setCategories] = useState<MasterData[]>([]);
    const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
    const [units, setUnits] = useState<MasterData[]>([]);
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [selectedSubcategory, setSelectedSubcategory] = useState('ทั้งหมด');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // ✅ Scan input state
    const [scanTerm, setScanTerm] = useState('');
    const scanRef = useRef<HTMLInputElement>(null);
    const focusScan = () => setTimeout(() => scanRef.current?.focus(), 0);

    // ✅ เก็บ barcode ที่สแกนมา เผื่อ prefill/auto-save ตอนเพิ่มสินค้า
    const [pendingBarcode, setPendingBarcode] = useState<string>('');

    // ✅ ฟังก์ชั่นสำหรับรักษา scroll position
    const fetchProductsKeepScroll = async () => {
        const scrollY = window.scrollY;
        await fetchProducts();
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    };

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);

    // Split Feature States
    const [recipes, setRecipes] = useState<SplitRecipe[]>([]);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

    // Barcode Manager States
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<StockProduct | null>(null);

    // Bulk Add State
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

    // Bulk Edit State  
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

    // Sorting State
    type SortOption = 'created_desc' | 'updated_desc' | 'name_asc' | 'stock_desc' | 'stock_asc' | 'no_image';
    const [sortBy, setSortBy] = useState<SortOption>('created_desc');

    // Form State
    const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);

    useEffect(() => {
        fetchMasterData();
        fetchProducts();
        fetchRecipes();
        focusScan();
    }, []);

    // ✅ คีย์ลัดแบบร้านจริง
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (document.activeElement as HTMLElement | null)?.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

            // F2 = โฟกัสช่องสแกน
            if (e.key === 'F2') {
                e.preventDefault();
                focusScan();
                return;
            }

            // ESC = ปิด modal ทั้งหมด
            if (e.key === 'Escape') {
                if (isProductModalOpen || isStockInModalOpen || isSplitModalOpen || isRecipeModalOpen || isBarcodeModalOpen) {
                    e.preventDefault();
                    setIsProductModalOpen(false);
                    setIsStockInModalOpen(false);
                    setIsSplitModalOpen(false);
                    setIsRecipeModalOpen(false);
                    setIsBarcodeModalOpen(false);
                    focusScan();
                }
                return;
            }

            // กันเผลอกด / ให้โฟกัส scan (เหมือน POS)
            if (e.key === '/' && !isTyping) {
                e.preventDefault();
                focusScan();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isProductModalOpen, isStockInModalOpen, isSplitModalOpen, isRecipeModalOpen, isBarcodeModalOpen]);

    const fetchMasterData = async () => {
        const { data: cats } = await supabase.from('master_categories').select('*').order('name');
        const { data: subs } = await supabase.from('master_subcategories').select('*').order('name');
        const { data: uns } = await supabase.from('master_units').select('*').order('name');
        setCategories(cats || []);
        setSubcategories(subs || []);
        setUnits(uns || []);
    };

    const fetchRecipes = async () => {
        const { data, error } = await supabase
            .from('product_split_recipes')
            .select(`
        *,
        parent_product:products!product_split_recipes_parent_product_id_fkey(id, name, sku),
        child_product:products!product_split_recipes_child_product_id_fkey(id, name, sku)
      `)
            .eq('is_active', true);
        if (error) console.error('Error fetching recipes:', error);
        else setRecipes(data || []);
    };

    const handleSaveRecipe = async (parentProductId: string, childProductId: string, quantityPerParent: number) => {
        const { error } = await supabase.from('product_split_recipes').upsert({
            parent_product_id: parentProductId,
            child_product_id: childProductId,
            quantity_per_parent: quantityPerParent
        }, { onConflict: 'parent_product_id,child_product_id' });

        if (error) throw error;
        toast.success('บันทึกสูตรเรียบร้อย!');
        fetchRecipes();
    };

    const handleExecuteSplit = async (parentProductId: string, quantity: number) => {
        const parentProduct = products.find(p => p.id === parentProductId);
        if (!parentProduct) throw new Error('ไม่พบสินค้าแม่');
        if (parentProduct.stock < quantity) throw new Error(`สต็อกไม่พอ! มี ${parentProduct.stock} ชิ้น`);

        const relatedRecipes = recipes.filter(r => r.parent_product_id === parentProductId);
        if (relatedRecipes.length === 0) throw new Error('ยังไม่มีสูตรสำหรับสินค้านี้ กรุณาตั้งค่าสูตรก่อน');

        // 1) หักสต็อกแม่
        const newParentStock = parentProduct.stock - quantity;
        await supabase.from('inventory')
            .update({ quantity: newParentStock })
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('product_id', parentProductId);

        await supabase.from('inventory_movements').insert({
            branch_id: CURRENT_BRANCH_ID,
            product_id: parentProductId,
            type: 'SPLIT_OUT',
            quantity: -quantity,
            balance_after: newParentStock,
            reason: `ตัดแบ่งออก ${quantity} ชิ้น`,
            ref_type: 'SPLIT'
        });

        // 2) เพิ่มสต็อกลูก
        for (const recipe of relatedRecipes) {
            const childProduct = products.find(p => p.id === recipe.child_product_id);
            const addQty = quantity * recipe.quantity_per_parent;
            const newChildStock = (childProduct?.stock || 0) + addQty;

            const { data: existingInv } = await supabase
                .from('inventory')
                .select('id')
                .eq('branch_id', CURRENT_BRANCH_ID)
                .eq('product_id', recipe.child_product_id)
                .single();

            if (existingInv) {
                await supabase.from('inventory')
                    .update({ quantity: newChildStock })
                    .eq('branch_id', CURRENT_BRANCH_ID)
                    .eq('product_id', recipe.child_product_id);
            } else {
                await supabase.from('inventory').insert({
                    branch_id: CURRENT_BRANCH_ID,
                    product_id: recipe.child_product_id,
                    quantity: addQty
                });
            }

            await supabase.from('inventory_movements').insert({
                branch_id: CURRENT_BRANCH_ID,
                product_id: recipe.child_product_id,
                type: 'SPLIT_IN',
                quantity: addQty,
                balance_after: newChildStock,
                reason: `รับจากการแบ่ง ${parentProduct.name} x${quantity}`,
                ref_type: 'SPLIT'
            });
        }

        toast.success(`ตัดแบ่งเรียบร้อย! หัก ${parentProduct.name} x${quantity}`);
        fetchProducts();
        focusScan();
    };

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        master_categories (name),
        master_subcategories (id, name),
        master_units (name),
        inventory (quantity),
        product_barcodes (barcode)
      `)
            .eq('is_active', true)
            .eq('inventory.branch_id', CURRENT_BRANCH_ID)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
        } else {
            const formatted = data?.map((p: any) => ({
                ...p,
                stock: p.inventory?.[0]?.quantity || 0,
                category: p.master_categories?.name || '-',
                subcategory: p.master_subcategories?.name || '',
                unit: p.master_units?.name || '-',
                barcode: p.product_barcodes?.[0]?.barcode || '',
                product_barcodes: p.product_barcodes
            })) || [];
            setProducts(formatted);
        }
        setLoading(false);
    };

    const openAddModal = () => {
        setSelectedProduct(null);
        setPendingBarcode('');
        setIsProductModalOpen(true);
    };

    const openEditModal = (product: any) => {
        setSelectedProduct(product);
        setPendingBarcode('');
        setIsProductModalOpen(true);
    };

    // ✅ สแกนในหน้า Stock: เจอ = เติมสต็อก, ไม่เจอ = เพิ่มสินค้า + พก barcode ไปด้วย
    const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter' && e.key !== 'Tab') return;

        e.preventDefault();

        const raw = scanTerm.trim();
        if (!raw) {
            focusScan();
            return;
        }

        // แนะนำให้ “เก็บเลขล้วน” เป็น barcode มาตรฐาน (กัน TH/อักขระแปลก)
        const code = raw.replace(/[^\d]/g, '');
        if (!code) {
            toast.warning('บาร์โค้ดที่สแกนมาไม่ใช่ตัวเลข (ลองตั้งให้สแกนเนอร์ส่งเลขล้วน หรือสลับ EN)');
            setScanTerm('');
            focusScan();
            return;
        }

        // หา match จาก barcode หลัก หรือรายการ barcodes
        const match = products.find(p =>
            (p.barcode && p.barcode === code) ||
            p.product_barcodes?.some((b: any) => b.barcode === code)
        );

        if (match) {
            // เจอสินค้า → เปิดเติมสต็อกทันที
            setSelectedProduct(match);
            setIsStockInModalOpen(true);
            setScanTerm('');
            return;
        }

        // ไม่เจอ → เปิดเพิ่มสินค้าใหม่ พร้อม pendingBarcode
        setPendingBarcode(code);
        setSelectedProduct(null);
        setIsProductModalOpen(true);
        setScanTerm('');
    };

    const handleSaveProduct = async (formData: any, selectedFile: File | null) => {
        let finalImageUrl = formData.image_url;
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, selectedFile);
            if (uploadError) throw new Error('อัปโหลดรูปไม่ผ่าน: ' + uploadError.message);
            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            finalImageUrl = data.publicUrl;
        }

        const productPayload = {
            sku: formData.sku || null,
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            cost: Number(formData.cost),
            category_id: formData.category_id,
            subcategory_id: formData.subcategory_id || null,
            unit_id: formData.unit_id,
            image_url: finalImageUrl
        };

        let productId = selectedProduct?.id;

        if (selectedProduct) {
            const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('products').insert(productPayload).select().single();
            if (error) throw error;
            productId = data.id;
        }

        // Save Inventory
        const { data: existingInv } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('product_id', productId)
            .single();

        const newQty = Number(formData.stock);

        if (existingInv) {
            if (existingInv.quantity !== newQty) {
                await supabase.from('inventory').update({ quantity: newQty }).eq('id', existingInv.id);
                await supabase.from('inventory_movements').insert({
                    branch_id: CURRENT_BRANCH_ID,
                    product_id: productId,
                    type: 'ADJUST',
                    quantity: newQty - existingInv.quantity,
                    balance_after: newQty,
                    reason: 'แก้ไขหน้าจัดการสินค้า',
                    ref_type: 'MANUAL'
                });
            }
        } else {
            await supabase.from('inventory').insert({
                branch_id: CURRENT_BRANCH_ID,
                product_id: productId,
                quantity: newQty
            });
            if (newQty > 0) {
                await supabase.from('inventory_movements').insert({
                    branch_id: CURRENT_BRANCH_ID,
                    product_id: productId,
                    type: 'ADJUST',
                    quantity: newQty,
                    balance_after: newQty,
                    reason: 'สินค้าใหม่',
                    ref_type: 'MANUAL'
                });
            }
        }

        // ✅ Auto-save Barcode:
        // - ถ้า ProductModal มี field barcode ก็ใช้
        // - ถ้าไม่มี field barcode ก็ยังเซฟจาก pendingBarcode ได้อยู่ดี
        const barcodeToSave = (formData?.barcode || pendingBarcode || '').toString().trim();
        if (barcodeToSave) {
            await supabase.from('product_barcodes').delete().eq('product_id', productId);
            await supabase.from('product_barcodes').insert({ product_id: productId, barcode: barcodeToSave });
            setPendingBarcode('');
        }

        toast.success('บันทึกเรียบร้อย!');
        setIsProductModalOpen(false);
        fetchProductsKeepScroll();
        focusScan();
    };

    const handleDelete = async (id: string) => {
        if (confirm('ยืนยันที่จะลบสินค้านี้?')) {
            const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
            if (error) toast.error('ลบไม่ได้: ' + error.message);
            else fetchProducts();
            focusScan();
        }
    };

    const handleStockIn = (product: StockProduct) => {
        setSelectedProduct(product);
        setIsStockInModalOpen(true);
    };

    const handleSaveStockIn = async (quantity: number) => {
        if (!selectedProduct) return;

        const newStock = (selectedProduct.stock || 0) + quantity;

        await supabase.from('inventory').update({ quantity: newStock })
            .eq('branch_id', CURRENT_BRANCH_ID)
            .eq('product_id', selectedProduct.id);

        await supabase.from('inventory_movements').insert({
            branch_id: CURRENT_BRANCH_ID,
            product_id: selectedProduct.id,
            type: 'RECEIVE',
            quantity: quantity,
            balance_after: newStock,
            reason: 'เติมสต็อกด่วน',
            ref_type: 'MANUAL'
        });

        toast.success(`เติมสต็อกเรียบร้อย!`);
        setIsStockInModalOpen(false);
        fetchProductsKeepScroll();
        focusScan();
    };

    // Barcode handlers
    const openBarcodeModal = (product: StockProduct) => {
        setSelectedProductForBarcode(product);
        setIsBarcodeModalOpen(true);
    };

    const handleSaveBarcodes = async (barcodes: string[]) => {
        if (!selectedProductForBarcode) return;

        await supabase.from('product_barcodes').delete().eq('product_id', selectedProductForBarcode.id);
        if (barcodes.length > 0) {
            await supabase.from('product_barcodes').insert(
                barcodes.map(barcode => ({ product_id: selectedProductForBarcode.id, barcode }))
            );
        }

        toast.success('บันทึกบาร์โค้ดเรียบร้อย!');
        setIsBarcodeModalOpen(false);
        fetchProductsKeepScroll();
        focusScan();
    };

    // Calculations
    const totalCost = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalProfit = totalValue - totalCost;

    const lowStockProducts = products.filter(p => {
        const minLevel = p.min_stock_level ?? 5;
        return p.stock <= minLevel && (p.is_alert_active !== false);
    });
    const lowStockCount = lowStockProducts.length;

    console.log(products.map(p => ({
        name: p.name,
        stock: p.stock,
        min: p.min_stock_level,
        alert: p.is_alert_active
    })));


    let filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.barcode && p.barcode.includes(searchTerm));
        const matchCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
        const matchSubcategory = selectedSubcategory === 'ทั้งหมด' || (p as any).subcategory === selectedSubcategory;
        return matchSearch && matchCategory && matchSubcategory;
    });

    if (showLowStockOnly) {
        const lowStockIds = new Set(lowStockProducts.map(p => p.id));
        filteredProducts = filteredProducts.filter(p => lowStockIds.has(p.id));
    }

    // ✅ Sorting
    filteredProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'created_desc':
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            case 'updated_desc':
                return new Date((b as any).updated_at || b.created_at || 0).getTime() - new Date((a as any).updated_at || a.created_at || 0).getTime();
            case 'name_asc':
                return a.name.localeCompare(b.name, 'th');
            case 'stock_desc':
                return b.stock - a.stock;
            case 'stock_asc':
                return a.stock - b.stock;
            case 'no_image':
                // สินค้าที่ไม่มีรูปขึ้นก่อน
                const aHasImage = a.image_url ? 1 : 0;
                const bHasImage = b.image_url ? 1 : 0;
                return aHasImage - bHasImage;
            default:
                return 0;
        }
    });

    return (
        <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 bg-white p-4 rounded-2xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 lg:px-6 lg:py-3 rounded-xl hover:bg-red-200 transition active:scale-95 border-2 border-red-200">
                        <ArrowLeft size={24} className="lg:w-8 lg:h-8" strokeWidth={3} /> <span className="text-lg lg:text-2xl font-bold">หน้าร้าน</span>
                    </Link>
                    <div className="h-10 w-px bg-gray-300 mx-2 hidden lg:block"></div>
                    <h1 className="text-xl lg:text-3xl font-black text-gray-800 flex items-center gap-2">
                        <Package size={24} className="lg:w-9 lg:h-9 text-blue-600" /> จัดการสต็อก (HQ)
                    </h1>
                </div>
                {loading && <div className="text-blue-600 font-bold animate-pulse text-sm">กำลังโหลด...</div>}
            </div>

            {/* Dashboard */}
            <StockDashboard
                totalCost={totalCost}
                totalValue={totalValue}
                totalProfit={totalProfit}
                lowStockCount={lowStockCount}
            />

            {/* Scan Bar */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-col lg:flex-row gap-3 items-center">
                <div className="flex-1 w-full">
                    <div className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-2">
                        <Barcode size={14} /> โหมดสแกน (Enter/Tab เพื่อทำงาน) <span className="text-gray-400">| F2 โฟกัส</span>
                    </div>
                    <input
                        ref={scanRef}
                        value={scanTerm}
                        onChange={(e) => setScanTerm(e.target.value)}
                        onKeyDown={handleScanKeyDown}
                        placeholder="สแกนบาร์โค้ดที่นี่... (เจอสินค้า = เติมสต็อก | ไม่เจอ = เพิ่มสินค้าใหม่)"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg"
                        autoFocus
                    />
                    {pendingBarcode && (
                        <div className="text-xs text-orange-600 mt-1">
                            กำลังเตรียมเพิ่มสินค้าใหม่ด้วยบาร์โค้ด: <span className="font-bold">{pendingBarcode}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                {['ทั้งหมด', ...categories.map(c => c.name)].map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setSelectedSubcategory('ทั้งหมด'); focusScan(); }}
                        className={`px-4 py-2 lg:px-5 lg:py-2.5 rounded-xl text-sm lg:text-base font-bold whitespace-nowrap transition shadow-sm ${selectedCategory === cat
                            ? 'bg-blue-600 text-white transform scale-105'
                            : 'bg-white text-gray-500 border hover:bg-gray-50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Subcategory Filter - แสดงเฉพาะเมื่อเลือกหมวดหมู่หลักแล้วและมีหมวดหมู่ย่อย */}
            {selectedCategory !== 'ทั้งหมด' && (() => {
                const selectedCat = categories.find(c => c.name === selectedCategory);
                const availableSubs = selectedCat ? subcategories.filter(s => s.category_id === selectedCat.id) : [];
                if (availableSubs.length === 0) return null;

                return (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {['ทั้งหมด', ...availableSubs.map(s => s.name)].map(sub => (
                            <button
                                key={sub}
                                onClick={() => { setSelectedSubcategory(sub); focusScan(); }}
                                className={`px-3 py-1.5 lg:px-5 lg:py-2 rounded-lg text-sm lg:text-base font-bold whitespace-nowrap transition shadow-sm ${selectedSubcategory === sub
                                    ? 'bg-purple-600 text-white transform scale-105'
                                    : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100'
                                    }`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                );
            })()}

            <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-3">
                <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="ค้นหาชื่อ, รหัส, หรือบาร์โค้ด..."
                        className="flex-1 lg:w-64"
                    />

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 font-bold text-gray-700 cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:outline-none text-sm lg:text-base"
                        >
                            <option value="created_desc">🆕 เพิ่มล่าสุด</option>
                            <option value="updated_desc">✏️ แก้ไขล่าสุด</option>
                            <option value="name_asc">🔤 ชื่อ ก-ฮ</option>
                            <option value="stock_desc">📦 มีมากสุด</option>
                            <option value="stock_asc">⚠️ ใกล้หมด</option>
                            <option value="no_image">🖼️ ยังไม่มีรูป</option>
                        </select>
                        <ArrowUpDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Bulk Edit Button */}
                    <button
                        onClick={() => setIsBulkEditModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm lg:text-base transition whitespace-nowrap bg-amber-100 text-amber-700 hover:bg-amber-200 border-2 border-amber-200"
                    >
                        <DollarSign size={20} /> แก้ราคาด่วน
                    </button>

                    {lowStockCount > 0 && (
                        <button
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition whitespace-nowrap ${showLowStockOnly
                                ? 'bg-red-500 text-white'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                        >
                            <span>⚠️ ใกล้หมด</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${showLowStockOnly ? 'bg-white text-red-500' : 'bg-red-500 text-white'}`}>
                                {lowStockCount}
                            </span>
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button onClick={() => setIsSplitModalOpen(true)} className="flex-1 lg:flex-none bg-orange-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 shadow-md text-lg">
                        <Scissors size={24} /> ตัดแบ่งของขาย
                    </button>
                    <button onClick={() => setIsRecipeModalOpen(true)} className="flex-1 lg:flex-none bg-purple-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-600 shadow-md text-lg">
                        <Settings size={24} /> ตั้งค่าสูตร
                    </button>
                    <button onClick={() => setIsBulkAddModalOpen(true)} className="flex-1 lg:flex-none bg-green-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-md text-lg">
                        <Layers size={24} /> เพิ่มหลายรายการ
                    </button>
                    <button onClick={openAddModal} className="flex-1 lg:flex-none bg-blue-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md text-lg">
                        <Plus size={24} /> เพิ่มสินค้าใหม่
                    </button>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 mb-4">
                {products.length === 0 && !loading && (
                    <div className="text-center p-8 text-gray-400 bg-white rounded-xl">ยังไม่มีสินค้า</div>
                )}
                {filteredProducts.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm p-4 border">
                        <div className="flex gap-3">
                            {/* รูป */}
                            <div className="shrink-0">
                                {product.image_url ? (
                                    <img src={product.image_url} alt="" className="w-16 h-16 object-cover bg-gray-100 rounded-lg border" />
                                ) : (
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                                        <ImageIcon size={20} />
                                    </div>
                                )}
                            </div>
                            {/* ข้อมูล */}
                            <div className="flex-1 min-w-0">
                                {product.sku && (
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold mb-1">
                                        {product.sku}
                                    </span>
                                )}
                                <div className="font-bold text-gray-800 text-base truncate">{product.name}</div>
                                <div className="text-sm text-gray-400">{product.category}</div>
                            </div>
                            {/* สต็อก */}
                            <div className="text-right shrink-0">
                                <div className={`text-2xl font-black ${(product.stock || 0) <= (product.min_stock_level ?? 5) ? 'text-red-500' : 'text-green-600'}`}>
                                    {product.stock}
                                </div>
                                <div className="text-xs text-gray-400">{product.unit}</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="text-sm">
                                <span className="text-gray-500">ทุน: {(product.cost || 0).toLocaleString()}</span>
                                <span className="mx-2">•</span>
                                <span className="font-bold text-blue-700">ขาย: {(product.price || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => handleStockIn(product)} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                                <Plus size={16} /> เติมสต็อก
                            </button>
                            <button onClick={() => openBarcodeModal(product)} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg" title="บาร์โค้ด">
                                <Barcode size={18} />
                            </button>
                            <button onClick={() => openEditModal(product)} className="p-2 bg-gray-100 text-gray-700 rounded-lg" title="แก้ไข">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-50 text-red-400 rounded-lg" title="ลบ">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 text-gray-600 text-left border-b text-lg">
                            <tr>
                                <th className="p-4 w-24">รูป</th>
                                <th className="p-4">รหัส / สินค้า</th>
                                <th className="p-4 text-center">ประเภท</th>
                                <th className="p-4 text-right">ทุน</th>
                                <th className="p-4 text-right">ขาย</th>
                                <th className="p-4 text-center">คงเหลือ</th>
                                <th className="p-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="text-lg">
                            {products.length === 0 && !loading && (
                                <tr><td colSpan={7} className="text-center p-8 text-gray-400">ยังไม่มีสินค้า</td></tr>
                            )}
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="border-b hover:bg-blue-50 transition">
                                    <td className="p-4">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt="" className="w-16 h-16 object-cover bg-gray-100 rounded-lg border" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            {product.sku && (
                                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded w-fit font-bold">
                                                    {product.sku}
                                                </span>
                                            )}
                                            <div className="font-bold text-gray-800 text-xl">{product.name}</div>
                                            <div className="text-gray-500 text-sm">{product.description || '-'}</div>
                                            {product.barcode && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Barcode size={12} /> {product.barcode}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded text-sm font-bold bg-gray-100 text-gray-600">{product.category}</span>
                                    </td>

                                    <td className="p-4 text-right text-gray-500">{(product.cost || 0).toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-blue-700 text-xl">{(product.price || 0).toLocaleString()}</td>

                                    <td className="p-4 text-center">
                                        <div className={`text-2xl font-black ${(product.stock || 0) <= (product.min_stock_level ?? 5) ? 'text-red-500' : 'text-green-600'}`}>
                                            {product.stock}
                                        </div>
                                        <div className="text-sm text-gray-400">{product.unit}</div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleStockIn(product)} className="p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="เติมสต็อก">
                                                <Plus size={24} />
                                            </button>
                                            <button onClick={() => openBarcodeModal(product)} className="p-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200" title="จัดการบาร์โค้ด">
                                                <Barcode size={24} />
                                            </button>
                                            <button onClick={() => openEditModal(product)} className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" title="แก้ไข">
                                                <Edit size={24} />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="p-3 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 hover:text-red-600" title="ลบ">
                                                <Trash2 size={24} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => { setIsProductModalOpen(false); setPendingBarcode(''); focusScan(); }}
                product={selectedProduct}
                categories={categories}
                subcategories={subcategories}
                units={units}
                onSave={(formData: any, file: File | null) => {
                    // ✅ ยัด barcode เข้าไปให้อัตโนมัติ (แม้ modal จะไม่มีช่อง barcode)
                    const merged = { ...formData, barcode: formData?.barcode || pendingBarcode };
                    return handleSaveProduct(merged, file);
                }}
                defaultBarcode={pendingBarcode}   // ✅ เพิ่มบรรทัดนี้
            />

            <StockInModal
                isOpen={isStockInModalOpen}
                onClose={() => { setIsStockInModalOpen(false); focusScan(); }}
                product={selectedProduct}
                onSave={handleSaveStockIn}
            />

            <SplitModal
                isOpen={isSplitModalOpen}
                onClose={() => { setIsSplitModalOpen(false); focusScan(); }}
                products={products}
                recipes={recipes}
                onExecute={handleExecuteSplit}
            />

            <RecipeModal
                isOpen={isRecipeModalOpen}
                onClose={() => { setIsRecipeModalOpen(false); focusScan(); }}
                products={products}
                recipes={recipes}
                onSave={handleSaveRecipe}
            />

            <BarcodeManager
                isOpen={isBarcodeModalOpen}
                onClose={() => { setIsBarcodeModalOpen(false); focusScan(); }}
                productId={selectedProductForBarcode?.id || ''}
                productName={selectedProductForBarcode?.name || ''}
                barcodes={selectedProductForBarcode?.product_barcodes?.map((b: any) => b.barcode) || []}
                onSave={handleSaveBarcodes}
            />

            <BulkAddModal
                isOpen={isBulkAddModalOpen}
                onClose={() => { setIsBulkAddModalOpen(false); focusScan(); }}
                categories={categories}
                units={units}
                onSaveComplete={fetchProducts}
            />

            <BulkEditModal
                isOpen={isBulkEditModalOpen}
                onClose={() => { setIsBulkEditModalOpen(false); focusScan(); }}
                products={products.map(p => ({
                    id: p.id,
                    name: p.name,
                    cost: p.cost,
                    price: p.price,
                    stock: p.stock
                }))}
                onSaveComplete={fetchProducts}
            />
        </div>
    );
}
