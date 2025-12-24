'use client';

import React, { useState, useEffect } from 'react';
import { Save, Upload, Tag, Barcode } from 'lucide-react';
import Modal from '../common/Modal';
import ImageCropper from '../common/ImageCropper';
import { useToast } from '../common/Toast';

interface MasterData {
    id: string;
    name: string;
}

interface ProductFormData {
    sku: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    stock: number;
    barcode: string;
    category_id: string;
    unit_id: string;
    image_url?: string;
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
    categories: MasterData[];
    units: MasterData[];
    onSave: (formData: ProductFormData, file: File | null) => Promise<void>;

    // ✅ เพิ่มอันนี้: รับบาร์โค้ดที่สแกนมาเพื่อ prefill ตอนเพิ่มสินค้าใหม่
    defaultBarcode?: string;
}

export default function ProductModal({
    isOpen,
    onClose,
    product,
    categories,
    units,
    onSave,
    defaultBarcode
}: ProductModalProps) {
    const [formValue, setFormValue] = useState<ProductFormData>({
        sku: '',
        name: '',
        description: '',
        price: 0,
        cost: 0,
        stock: 0,
        barcode: '',
        category_id: '',
        unit_id: '',
        image_url: ''
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // State สำหรับ Image Cropper
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string>('');
    const toast = useToast();

    useEffect(() => {
        if (!isOpen) return;

        if (product) {
            // ✅ โหมดแก้ไข: ใช้ค่าจากสินค้าเดิม
            setFormValue({
                sku: product.sku || '',
                name: product.name || '',
                description: product.description || '',
                price: product.price || 0,
                cost: product.cost || 0,
                stock: product.stock || 0,
                barcode: product.barcode || '',
                category_id: product.category_id || '',
                unit_id: product.unit_id || '',
                image_url: product.image_url || ''
            });
            setPreviewUrl(product.image_url || null);
        } else {
            // ✅ โหมดเพิ่มใหม่: ตั้ง barcode = defaultBarcode (ถ้ามี)
            setFormValue({
                sku: '',
                name: '',
                description: '',
                price: 0,
                cost: 0,
                stock: 0,
                barcode: (defaultBarcode || '').toString(),
                category_id: categories[0]?.id || '',
                unit_id: units[0]?.id || '',
                image_url: ''
            });
            setPreviewUrl(null);
        }

        setSelectedFile(null);
    }, [isOpen, product, categories, units, defaultBarcode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }
        const file = e.target.files[0];
        // เปิด Image Cropper แทนการ preview ตรงๆ
        const reader = new FileReader();
        reader.onload = () => {
            setTempImageSrc(reader.result as string);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
        // Reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้
        e.target.value = '';
    };

    // Handle cropped image
    const handleCropComplete = (croppedBlob: Blob) => {
        const croppedFile = new File([croppedBlob], 'cropped_image.jpg', { type: 'image/jpeg' });
        setSelectedFile(croppedFile);
        setPreviewUrl(URL.createObjectURL(croppedBlob));
        setIsCropperOpen(false);
        setTempImageSrc('');
    };

    const handleSave = async () => {
        if (!formValue.name) {
            toast.warning('กรุณาใส่ชื่อสินค้า');
            return;
        }
        setUploading(true);
        try {
            await onSave(formValue, selectedFile);
            onClose();
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                headerColor="bg-blue-600"
                size="xl"
                footer={
                    <button
                        onClick={handleSave}
                        disabled={uploading}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400"
                    >
                        {uploading ? 'กำลังอัปโหลด...' : (
                            <>
                                <Save /> บันทึก
                            </>
                        )}
                    </button>
                }
            >
                <div className="space-y-4">
                    {/* Image Upload */}
                    <div className="flex flex-col items-center justify-center mb-4">
                        <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500">
                            {previewUrl ? (
                                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <Upload className="mx-auto mb-1" />
                                    <span>รูปสินค้า</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* รหัสสินค้า & บาร์โค้ด */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
                        <div>
                            <label className="block text-gray-700 mb-1 font-bold flex items-center gap-1">
                                <Tag size={16} /> รหัสสินค้า (SKU)
                            </label>
                            <input
                                type="text"
                                value={formValue.sku}
                                onChange={(e) => setFormValue({ ...formValue, sku: e.target.value })}
                                className="w-full border p-3 rounded-lg text-lg uppercase"
                                placeholder="เช่น A-001"
                            />
                            <div className="text-xs text-gray-400 mt-1">สำหรับสินค้าที่ไม่มีบาร์โค้ด</div>
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1 font-bold flex items-center gap-1">
                                <Barcode size={16} /> บาร์โค้ด
                            </label>
                            <input
                                type="text"
                                value={formValue.barcode}
                                onChange={(e) => setFormValue({ ...formValue, barcode: e.target.value })}
                                className="w-full border p-3 rounded-lg text-lg font-mono"
                                placeholder="ยิงสแกนเนอร์ที่นี่"
                            />
                            <div className="text-xs text-gray-400 mt-1">
                                ถ้ามีบาร์โค้ดสากล {defaultBarcode ? `(เติมให้อัตโนมัติ: ${defaultBarcode})` : ''}
                            </div>
                        </div>
                    </div>

                    {/* Name & Formula */}
                    <div>
                        <label className="block text-gray-700 mb-1">ชื่อสินค้า *</label>
                        <input
                            type="text"
                            value={formValue.name}
                            onChange={(e) => setFormValue({ ...formValue, name: e.target.value })}
                            className="w-full border p-3 rounded text-lg"
                            placeholder="เช่น ปุ๋ยตรากระต่าย"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-1">รายละเอียด / สูตร</label>
                        <input
                            type="text"
                            value={formValue.description}
                            onChange={(e) => setFormValue({ ...formValue, description: e.target.value })}
                            className="w-full border p-3 rounded text-lg"
                            placeholder="เช่น สูตร 46-0-0"
                        />
                    </div>

                    {/* Dropdowns */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 mb-1">หมวดหมู่ *</label>
                            <select
                                value={formValue.category_id}
                                onChange={(e) => setFormValue({ ...formValue, category_id: e.target.value })}
                                className="w-full border p-3 rounded text-lg bg-white"
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1">หน่วยนับ *</label>
                            <select
                                value={formValue.unit_id}
                                onChange={(e) => setFormValue({ ...formValue, unit_id: e.target.value })}
                                className="w-full border p-3 rounded text-lg bg-white"
                            >
                                {units.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Price & Cost */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div>
                            <label className="block text-gray-700 mb-1">ราคาทุน</label>
                            <input
                                type="number"
                                value={formValue.cost}
                                onChange={(e) => setFormValue({ ...formValue, cost: Number(e.target.value) })}
                                className="w-full border p-3 rounded text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1">ราคาขาย</label>
                            <input
                                type="number"
                                value={formValue.price}
                                onChange={(e) => setFormValue({ ...formValue, price: Number(e.target.value) })}
                                className="w-full border p-3 rounded text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1 font-bold text-blue-600">สต็อก</label>
                            <input
                                type="number"
                                value={formValue.stock}
                                onChange={(e) => setFormValue({ ...formValue, stock: Number(e.target.value) })}
                                className="w-full border p-3 rounded text-lg bg-blue-50 font-bold"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Image Cropper Modal */}
            <ImageCropper
                isOpen={isCropperOpen}
                imageSrc={tempImageSrc}
                onComplete={handleCropComplete}
                onCancel={() => {
                    setIsCropperOpen(false);
                    setTempImageSrc('');
                }}
                aspectRatio={1}
            />
        </>
    );
}
