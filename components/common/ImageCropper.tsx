'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
    isOpen: boolean;
    imageSrc: string;
    onComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number;
}

// Helper function to get cropped image as blob
async function getCroppedImg(
    image: HTMLImageElement,
    crop: PixelCrop
): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Output size (cropped area in natural resolution)
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas is empty'));
                }
            },
            'image/jpeg',
            0.9
        );
    });
}

// Helper to create centered crop
function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 80,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
}

export default function ImageCropper({
    isOpen,
    imageSrc,
    onComplete,
    onCancel,
    aspectRatio = 1
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);

    // Initialize crop when image loads
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspectRatio));
    }, [aspectRatio]);

    // Handle crop completion
    const handleComplete = async () => {
        if (!completedCrop || !imgRef.current) return;

        try {
            const blob = await getCroppedImg(imgRef.current, completedCrop);
            onComplete(blob);
        } catch (error) {
            console.error('Error cropping image:', error);
        }
    };

    // Handle keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                handleComplete();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, completedCrop, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">✂️ ครอปรูปภาพ</h3>
                        <p className="text-xs text-gray-400">ลากกรอบเพื่อเลือกพื้นที่ที่ต้องการ</p>
                    </div>
                    <button onClick={onCancel} className="hover:bg-gray-700 p-2 rounded-lg transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspectRatio}
                        circularCrop={false}
                        className="max-w-full"
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop preview"
                            onLoad={onImageLoad}
                            style={{
                                maxHeight: '60vh',
                                maxWidth: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    </ReactCrop>
                </div>

                {/* Actions */}
                <div className="bg-gray-800 p-4 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg font-medium transition"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleComplete}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition flex items-center gap-2"
                    >
                        <Check size={18} />
                        ตกลง
                        <span className="text-xs opacity-75 bg-white/20 px-2 py-0.5 rounded">Enter</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
