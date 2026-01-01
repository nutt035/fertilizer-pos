'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Check, X, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';

interface Product {
    id: string;
    name: string;
    sku?: string;
    image_url?: string;
}

interface MatchedFile {
    file: File;
    preview: string;
    matchedProduct: Product | null;
    matchType: 'name' | 'sku' | 'none';
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
                matchType
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

    const changeProductMatch = (index: number, productId: string) => {
        setMatchedFiles(prev => {
            const newList = [...prev];
            const product = products.find(p => p.id === productId) || null;
            newList[index] = {
                ...newList[index],
                matchedProduct: product,
                matchType: product ? 'name' : 'none'
            };
            return newList;
        });
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
                                    className="w-14 h-14 object-cover rounded-lg border"
                                />

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-700 truncate">
                                        {matched.file.name}
                                    </div>

                                    {/* Product Selector */}
                                    <select
                                        value={matched.matchedProduct?.id || ''}
                                        onChange={(e) => changeProductMatch(index, e.target.value)}
                                        className={`mt-1 w-full text-sm border rounded-lg px-2 py-1 ${matched.matchedProduct
                                                ? 'border-green-300 bg-white'
                                                : 'border-orange-300 bg-white'
                                            }`}
                                    >
                                        <option value="">-- เลือกสินค้า --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.sku ? `[${p.sku}] ` : ''}{p.name}
                                            </option>
                                        ))}
                                    </select>
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
