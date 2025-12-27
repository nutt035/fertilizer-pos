'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Package, GripVertical, Search, Plus, X, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface Product {
    id: string;
    name: string;
    category_id: string;
    subcategory_id?: string;
    image_url?: string;
}

interface Category {
    id: string;
    name: string;
}

interface Subcategory {
    id: string;
    name: string;
    category_id: string;
}

export default function CategoriesPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const [catsRes, subCatsRes, prodsRes] = await Promise.all([
            supabase.from('master_categories').select('id, name').order('sort_order', { ascending: true }),
            supabase.from('master_subcategories').select('id, name, category_id').order('name', { ascending: true }),
            supabase.from('products').select('id, name, category_id, subcategory_id, image_url').eq('is_active', true).order('name', { ascending: true })
        ]);

        const cats = catsRes.data || [];
        setCategories(cats);
        setSubcategories(subCatsRes.data || []);
        setProducts(prodsRes.data || []);

        // Expand all categories by default
        setExpandedCategories(new Set(cats.map((c: Category) => c.id)));
        setLoading(false);
    };

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const handleDragStart = (e: React.DragEvent, product: Product) => {
        setDraggedProduct(product);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedProduct(null);
        setDragOverTarget(null);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverTarget(targetId);
    };

    const handleDragLeave = () => {
        setDragOverTarget(null);
    };

    // Drop on category or subcategory
    const handleDrop = async (e: React.DragEvent, targetCategoryId: string, targetSubcategoryId?: string) => {
        e.preventDefault();
        setDragOverTarget(null);

        if (!draggedProduct) return;

        const isSameLocation =
            draggedProduct.category_id === targetCategoryId &&
            draggedProduct.subcategory_id === targetSubcategoryId;

        if (isSameLocation) return;

        // Optimistic update
        setProducts(prev => prev.map(p =>
            p.id === draggedProduct.id
                ? { ...p, category_id: targetCategoryId, subcategory_id: targetSubcategoryId }
                : p
        ));

        const { error } = await supabase
            .from('products')
            .update({
                category_id: targetCategoryId,
                subcategory_id: targetSubcategoryId || null
            })
            .eq('id', draggedProduct.id);

        if (error) {
            toast.error('บันทึกไม่สำเร็จ');
            setProducts(prev => prev.map(p =>
                p.id === draggedProduct.id
                    ? { ...p, category_id: draggedProduct.category_id, subcategory_id: draggedProduct.subcategory_id }
                    : p
            ));
        } else {
            const targetName = targetSubcategoryId
                ? subcategories.find(s => s.id === targetSubcategoryId)?.name
                : categories.find(c => c.id === targetCategoryId)?.name;
            toast.success(`ย้าย "${draggedProduct.name}" ไป ${targetName}`);
        }

        setDraggedProduct(null);
    };

    // Add subcategory
    const handleAddSubcategory = async (categoryId: string) => {
        if (!newSubcategoryName.trim()) return;

        const { data, error } = await supabase
            .from('master_subcategories')
            .insert({ name: newSubcategoryName.trim(), category_id: categoryId })
            .select()
            .single();

        if (error) {
            toast.error('เพิ่มหมวดย่อยไม่สำเร็จ');
        } else {
            setSubcategories(prev => [...prev, data]);
            toast.success(`เพิ่มหมวดย่อย "${newSubcategoryName}" แล้ว`);
        }

        setNewSubcategoryName('');
        setAddingSubcategoryTo(null);
    };

    // Delete subcategory
    const handleDeleteSubcategory = async (subcategoryId: string, subcategoryName: string) => {
        if (!confirm(`ลบหมวดย่อย "${subcategoryName}"?`)) return;

        const { error } = await supabase.from('master_subcategories').delete().eq('id', subcategoryId);

        if (error) {
            toast.error('ลบไม่สำเร็จ');
        } else {
            setSubcategories(prev => prev.filter(s => s.id !== subcategoryId));
            // Clear subcategory_id from products
            setProducts(prev => prev.map(p =>
                p.subcategory_id === subcategoryId ? { ...p, subcategory_id: undefined } : p
            ));
            toast.success(`ลบหมวดย่อย "${subcategoryName}" แล้ว`);
        }
    };

    // Filter products by search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 lg:p-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/stock" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition">
                        <ArrowLeft size={20} /> กลับ
                    </Link>
                    <h1 className="text-xl lg:text-2xl font-black text-gray-800 flex items-center gap-2">
                        <Package className="text-purple-600" /> จัดหมวดหมู่สินค้า
                    </h1>
                </div>

                <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาสินค้า..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl w-full lg:w-80 focus:border-purple-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <GripVertical size={24} className="text-purple-600" />
                <p className="text-purple-700 font-bold">
                    ลากสินค้าไปวางในหมวดหมู่หลักหรือหมวดย่อย
                </p>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {categories.map(category => {
                    const categorySubcats = subcategories.filter(s => s.category_id === category.id);
                    const categoryProducts = filteredProducts.filter(p => p.category_id === category.id && !p.subcategory_id);
                    const isExpanded = expandedCategories.has(category.id);

                    return (
                        <div key={category.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            {/* Category Header */}
                            <div
                                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 cursor-pointer flex items-center justify-between"
                                onClick={() => toggleCategory(category.id)}
                            >
                                <div>
                                    <h2 className="font-bold text-lg">{category.name}</h2>
                                    <p className="text-purple-200 text-sm">
                                        {filteredProducts.filter(p => p.category_id === category.id).length} สินค้า
                                    </p>
                                </div>
                                {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                            </div>

                            {isExpanded && (
                                <div className="p-3 space-y-3">
                                    {/* Main category drop zone */}
                                    <div
                                        onDragOver={(e) => handleDragOver(e, `cat-${category.id}`)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, category.id)}
                                        className={`min-h-[60px] p-2 rounded-xl border-2 border-dashed transition ${dragOverTarget === `cat-${category.id}`
                                            ? 'border-purple-400 bg-purple-50'
                                            : 'border-gray-200'
                                            }`}
                                    >
                                        <p className="text-xs text-gray-400 mb-2">📁 ไม่มีหมวดย่อย</p>
                                        <div className="space-y-1">
                                            {categoryProducts.map(product => (
                                                <div
                                                    key={product.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, product)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-grab text-sm ${draggedProduct?.id === product.id ? 'opacity-50' : ''
                                                        }`}
                                                >
                                                    <GripVertical size={14} className="text-gray-400" />
                                                    <span className="truncate">{product.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Subcategories */}
                                    {categorySubcats.map(subcat => {
                                        const subcatProducts = filteredProducts.filter(p => p.subcategory_id === subcat.id);
                                        return (
                                            <div
                                                key={subcat.id}
                                                onDragOver={(e) => handleDragOver(e, `sub-${subcat.id}`)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, category.id, subcat.id)}
                                                className={`p-2 rounded-xl border-2 transition ${dragOverTarget === `sub-${subcat.id}`
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Tag size={14} className="text-blue-600" />
                                                        <span className="text-sm font-bold text-blue-700">{subcat.name}</span>
                                                        <span className="text-xs text-gray-400">({subcatProducts.length})</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteSubcategory(subcat.id, subcat.name)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div className="space-y-1 min-h-[30px]">
                                                    {subcatProducts.map(product => (
                                                        <div
                                                            key={product.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, product)}
                                                            onDragEnd={handleDragEnd}
                                                            className={`flex items-center gap-2 p-2 bg-white rounded-lg cursor-grab text-sm border ${draggedProduct?.id === product.id ? 'opacity-50' : ''
                                                                }`}
                                                        >
                                                            <GripVertical size={14} className="text-gray-400" />
                                                            <span className="truncate">{product.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add Subcategory */}
                                    {addingSubcategoryTo === category.id ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newSubcategoryName}
                                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                                placeholder="ชื่อหมวดย่อย..."
                                                className="flex-1 border-2 border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddSubcategory(category.id);
                                                    if (e.key === 'Escape') setAddingSubcategoryTo(null);
                                                }}
                                            />
                                            <button
                                                onClick={() => handleAddSubcategory(category.id)}
                                                className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm"
                                            >
                                                เพิ่ม
                                            </button>
                                            <button
                                                onClick={() => { setAddingSubcategoryTo(null); setNewSubcategoryName(''); }}
                                                className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingSubcategoryTo(category.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-blue-600 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-bold"
                                        >
                                            <Plus size={16} /> เพิ่มหมวดย่อย
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
