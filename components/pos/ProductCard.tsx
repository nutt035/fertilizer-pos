'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { CartItem } from '../../types';

interface ProductCardProps {
    product: CartItem;
    onClick: (product: CartItem) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
    const isOutOfStock = product.stock <= 0;

    return (
        <div
            onClick={() => onClick(product)}
            className={`bg-white rounded-xl lg:rounded-2xl shadow-md border-2 transition cursor-pointer active:scale-95 flex flex-col overflow-hidden h-56 lg:h-72 group ${isOutOfStock
                ? 'border-red-300 opacity-80'
                : 'border-transparent hover:border-blue-500 hover:shadow-xl'
                }`}
        >
            {/* Image */}
            <div className="h-24 lg:h-32 w-full bg-white flex items-center justify-center relative overflow-hidden p-2">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        className="object-contain h-full w-full group-hover:scale-110 transition duration-300"
                        alt={product.name}
                    />
                ) : (
                    <div className="text-gray-300">
                        <ShoppingCart size={32} />
                    </div>
                )}
                <div className="absolute top-1 right-1 lg:top-2 lg:right-2 bg-gray-100 text-gray-600 px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-md">
                    {product.unit || 'ชิ้น'}
                </div>
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-black text-xl lg:text-3xl rotate-[-15deg] border-2 lg:border-4 border-white px-2 lg:px-4 py-1 rounded">
                            หมด!
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-2 lg:p-4 flex flex-col flex-1 justify-between bg-white relative">
                <div>
                    <div className="text-gray-700 text-sm lg:text-lg leading-tight line-clamp-2 font-medium">
                        {product.name}
                    </div>
                </div>
                <div className="flex justify-between items-end mt-1 lg:mt-2">
                    <div className="text-red-500 font-bold text-lg lg:text-2xl">
                        {product.price.toLocaleString()}
                    </div>
                    <div className={`text-[10px] lg:text-xs font-bold px-2 py-1 rounded ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}>
                        เหลือ: {product.stock}
                    </div>
                </div>
            </div>
        </div>
    );
}
