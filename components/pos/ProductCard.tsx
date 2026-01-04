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
            className={`bg-white rounded-xl lg:rounded-2xl shadow-md border-2 transition cursor-pointer active:scale-95 flex flex-col overflow-hidden h-72 lg:h-96 group ${isOutOfStock
                ? 'border-red-300 opacity-80'
                : 'border-transparent hover:border-blue-500 hover:shadow-xl'
                }`}
        >
            {/* Image */}
            <div className="h-40 lg:h-52 w-full bg-gray-50 flex items-center justify-center relative overflow-hidden p-3">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        className="object-contain h-full w-full group-hover:scale-110 transition duration-300"
                        alt={product.name}
                    />
                ) : (
                    <div className="text-gray-300">
                        <ShoppingCart size={56} />
                    </div>
                )}
                <div className="absolute top-1 right-1 lg:top-2 lg:right-2 bg-gray-100 text-gray-600 px-2 py-1 text-sm lg:text-base font-bold rounded-md">
                    {product.unit || 'ชิ้น'}
                </div>
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-black text-2xl lg:text-4xl rotate-[-15deg] border-2 lg:border-4 border-white px-3 lg:px-5 py-1 lg:py-2 rounded">
                            หมด!
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 lg:p-5 flex flex-col flex-1 justify-between bg-white relative">
                <div>
                    <div className="text-gray-700 text-base lg:text-xl leading-tight line-clamp-2 font-bold product-card-name">
                        {product.name}
                        {(product as any).size && (
                            <span className="ml-1 text-purple-600 text-sm lg:text-base font-normal">({(product as any).size})</span>
                        )}
                    </div>
                    {product.description && (
                        <div className="text-gray-500 text-sm lg:text-base leading-tight mt-1 line-clamp-1">
                            {product.description}
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-end mt-2 lg:mt-3">
                    <div className="text-red-500 font-black text-xl lg:text-3xl product-card-price">
                        {product.price.toLocaleString()}
                        <span className="text-gray-500 text-sm lg:text-base font-normal ml-1">/{product.unit || 'ชิ้น'}</span>
                    </div>
                    <div className={`text-sm lg:text-base font-bold px-3 py-1.5 rounded-lg ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}>
                        เหลือ: {product.stock}
                    </div>
                </div>
            </div>
        </div>
    );
}
