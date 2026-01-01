'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Check, X, AlertCircle, Search } from 'lucide-react';
import Modal from '../common/Modal';

interface Product {
    id: string;
    name: string;
    sku?: string;
    size?: string;
    image_url?: string;
}

interface MatchedFile {
    file: File;
    preview: string;
    matchedProduct: Product | null;
    matchType: 'name' | 'sku' | 'none';
    searchTerm: string;
    showDropdown: boolean;
}

interface BulkImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onUpload: (productId: string, file: File) => Promise<void>;
}

export default function BulkImageModal({ isOpen, onClose, products, onUpload }: BulkImageModalProps) {
    const [matchedFiles, setMatchedFiles] = useState<MatchedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const matchFileToProduct = (fileName: string): { product: Product | null; matchType: 'name' | 'sku' | 'none' } => {
        const cleanName = fileName.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();

        // Try matching by SKU first (exact match)
        const skuMatch = products.find(p => p.sku && p.sku.toLowerCase() === cleanName);
        if (skuMatch) return { product: skuMatch, matchType: 'sku' };

        // Try matching by name (partial match)
        const nameMatch = products.find(p => {
            const productName = p.name.toLowerCase();
            return productName.includes(cleanName) || cleanName.includes(productName);
        });
        if (nameMatch) return { product: nameMatch, matchType: 'name' };

        return { product: null, matchType: 'none' };
    };

    const handleFilesSelect = useCallback((files: FileList | null) => {
        if (!files) return;

        const newMatched: MatchedFile[] = [];
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const { product, matchType } = matchFileToProduct(file.name);
            newMatched.push({
                file,
                preview: URL.createObjectURL(file),
                matchedProduct: product,
                matchType,
                searchTerm: product ? `${product.name}${product.size ? ` (${product.size})` : ''}` : '',
                showDropdown: false
            });
        });

        setMatchedFiles(prev => [...prev, ...newMatched]);
    }, [products]);

    const removeFile = (index: number) => {
        setMatchedFiles(prev => {
            const newList = [...prev];
            URL.revokeObjectURL(newList[index].preview);
            newList.splice(index, 1);
            return newList;
        });
    };

    const updateSearchTerm = (index: number, value: string) => {
        setMatchedFiles(prev => {
            const newList = [...prev];
            newList[index] = {
                ...newList[index],
                searchTerm: value,
                showDropdown: true
            };
            return newList;
        });
    };

    const selectProduct = (index: number, product: Product | null) => {
        setMatchedFiles(prev => {
            const newList = [...prev];
            newList[index] = {
                ...newList[index],
                matchedProduct: product,
                matchType: product ? 'name' : 'none',
                searchTerm: product ? `${product.name}${product.size ? ` (${product.size})` : ''}` : '',
                showDropdown: false
            };
            return newList;
        });
    };

    const toggleDropdown = (index: number, show: boolean) => {
        setMatchedFiles(prev => {
            const newList = [...prev];
            newList[index] = {
                ...newList[index],
                showDropdown: show
            };
            return newList;
        });
    };

    const getFilteredProducts = (searchTerm: string) => {
        if (!searchTerm.trim()) return products.slice(0, 10);
        const term = searchTerm.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.sku && p.sku.toLowerCase().includes(term)) ||
            (p.size && p.size.toLowerCase().includes(term))
        ).slice(0, 10);
    };

    const handleUploadAll = async () => {
        const filesToUpload = matchedFiles.filter(m => m.matchedProduct);
        if (filesToUpload.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        for (let i = 0; i < filesToUpload.length; i++) {
            const { file, matchedProduct } = filesToUpload[i];
            if (matchedProduct) {
                try {
                    await onUpload(matchedProduct.id, file);
                } catch (e) {
                    console.error('Upload error:', e);
                }
            }
            setUploadProgress(((i + 1) / filesToUpload.length) * 100);
        }

        setUploading(false);
        setMatchedFiles([]);
        onClose();
    };

    const handleClose = () => {
        matchedFiles.forEach(m => URL.revokeObjectURL(m.preview));
        setMatchedFiles([]);
        onClose();
    };

    const matchedCount = matchedFiles.filter(m => m.matchedProduct).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="อัปโหลดรูปหลายรายการ"
            headerColor="bg-purple-600"
            size="xl"
            footer={
                <div className="flex gap-3">
                    <button
                        onClick={handleUploadAll}
                        disabled={uploading || matchedCount === 0}
                        className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>กำลังอัปโหลด... {Math.round(uploadProgress)}%</>
                        ) : (
                            <>
                                <Upload size={20} /> อัปโหลด {matchedCount} รูป
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300"
                    >
                        ยกเลิก
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Drop Zone */}
                <label className="block border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition">
                    <Upload size={40} className="mx-auto text-purple-400 mb-2" />
                    <p className="text-purple-700 font-bold text-lg">คลิกเพื่อเลือกรูป หรือลากมาวาง</p>
                    <p className="text-gray-500 text-sm mt-1">ระบบจะจับคู่ชื่อไฟล์กับ SKU หรือชื่อสินค้าอัตโนมัติ</p>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFilesSelect(e.target.files)}
                    />
                </label>

                {/* Matched Files List */}
                {matchedFiles.length > 0 && (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <div className="flex justify-between items-center text-sm text-gray-500 px-2">
                            <span>รายการไฟล์ ({matchedFiles.length})</span>
                            <span className="text-green-600 font-bold">จับคู่ได้ {matchedCount} รายการ</span>
                        </div>

                        {matchedFiles.map((matched, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 ${matched.matchedProduct
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-orange-200 bg-orange-50'
                                    }`}
                            >
                                {/* Preview */}
                                <img
                                    src={matched.preview}
                                    alt=""
                                    className="w-14 h-14 object-cover rounded-lg border shrink-0"
                                />

                                {/* File Info + Search */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 truncate mb-1">
                                        📁 {matched.file.name}
                                    </div>

                                    {/* Searchable Product Input */}
                                    <div className="relative">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={matched.searchTerm}
                                                onChange={(e) => updateSearchTerm(index, e.target.value)}
                                                onFocus={() => toggleDropdown(index, true)}
                                                onBlur={() => setTimeout(() => toggleDropdown(index, false), 200)}
                                                placeholder="🔍 พิมพ์ชื่อหรือ SKU เพื่อค้นหา..."
                                                className={`w-full pl-8 pr-3 py-2 text-sm border-2 rounded-lg focus:outline-none ${matched.matchedProduct
                                                        ? 'border-green-300 bg-white focus:border-green-500'
                                                        : 'border-orange-300 bg-white focus:border-orange-500'
                                                    }`}
                                            />
                                        </div>

                                        {/* Dropdown Results */}
                                        {matched.showDropdown && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {getFilteredProducts(matched.searchTerm).length > 0 ? (
                                                    getFilteredProducts(matched.searchTerm).map(p => (
                                                        <button
                                                            key={p.id}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => selectProduct(index, p)}
                                                            className={`w-full text-left px-3 py-2 hover:bg-purple-50 transition flex items-center gap-2 ${matched.matchedProduct?.id === p.id ? 'bg-green-50' : ''
                                                                }`}
                                                        >
                                                            {p.image_url ? (
                                                                <img src={p.image_url} className="w-8 h-8 rounded object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                                                                    <ImageIcon size={14} />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-bold text-gray-800 truncate">
                                                                    {p.name}
                                                                    {p.size && <span className="ml-1 text-purple-500 font-normal">({p.size})</span>}
                                                                </div>
                                                                {p.sku && <div className="text-xs text-blue-500">[{p.sku}]</div>}
                                                            </div>
                                                            {matched.matchedProduct?.id === p.id && (
                                                                <Check size={16} className="text-green-500" />
                                                            )}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center text-gray-400 text-sm">
                                                        ไม่พบสินค้า
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Product Badge */}
                                    {matched.matchedProduct && (
                                        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                                            <Check size={12} />
                                            <span>เลือกแล้ว: {matched.matchedProduct.name}</span>
                                            {matched.matchedProduct.size && (
                                                <span className="text-purple-500">({matched.matchedProduct.size})</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Status Icon */}
                                <div className="shrink-0">
                                    {matched.matchedProduct ? (
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                                            <Check size={18} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white">
                                            <AlertCircle size={18} />
                                        </div>
                                    )}
                                </div>

                                {/* Remove */}
                                <button
                                    onClick={() => removeFile(index)}
                                    className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {matchedFiles.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                        <p>ยังไม่มีรูปที่เลือก</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
