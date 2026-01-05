import React from 'react';
import { Trash2, Pencil, Save, Tag } from 'lucide-react';
import { CartItem } from '../../types';

interface CartItemRowProps {
    item: CartItem;
    index: number;
    onUpdateQuantity: (productId: string, newQty: number) => void;
    onRemove: (productId: string) => void;
    editingNoteId: string | null;
    tempNote: string;
    onStartEditNote: (item: CartItem) => void;
    onSaveNote: (productId: string) => void;
    onTempNoteChange: (note: string) => void;
    onOpenDiscount: (item: CartItem) => void;
}

export default function CartItemRow({
    item,
    index,
    onUpdateQuantity,
    onRemove,
    editingNoteId,
    tempNote,
    onStartEditNote,
    onSaveNote,
    onTempNoteChange,
    onOpenDiscount
}: CartItemRowProps) {
    return (
        <div className="bg-blue-50 p-2 lg:p-3 rounded-lg border border-blue-100 relative">
            <div className="flex items-start justify-between mb-1 lg:mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {index + 1}
                        </span>
                        <h3 className="text-base lg:text-lg font-bold text-gray-800 leading-tight">
                            {item.name}
                        </h3>
                    </div>
                    <div className="text-gray-500 text-xs lg:text-sm pl-6 mt-1 flex gap-2">
                        <span>หมวด: {item.category || '-'} | {item.unit}</span>
                        {/* Show applied discount badge */}
                        {(item.discountAmount || 0) > 0 && (
                            <span className="text-pink-600 bg-pink-100 px-1 rounded text-xs font-bold">
                                -{item.discountType === 'percent' ? `${item.discountAmount}%` : `฿${item.discountAmount}`}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right pl-2">
                    <div className="text-lg lg:text-xl font-bold text-blue-900">
                        {/* Calculate display price with discount */}
                        {(() => {
                            let finalPrice = item.price * item.quantity;
                            if (item.discountAmount && item.discountType) {
                                if (item.discountType === 'percent') finalPrice = finalPrice - (finalPrice * item.discountAmount / 100);
                                else finalPrice = finalPrice - item.discountAmount;
                            }
                            return finalPrice.toLocaleString();
                        })()}
                    </div>
                    <div className="text-xs text-gray-400">@{item.price.toLocaleString()}</div>
                </div>
            </div>

            <div className="flex items-center justify-between pl-6 gap-2">
                {/* Quantity Controls */}
                <div className="flex items-center gap-1 lg:gap-2 bg-white px-1 py-1 rounded-md border shadow-sm">
                    <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 font-bold text-lg lg:text-xl"
                    >
                        -
                    </button>
                    <span className="text-lg lg:text-xl font-bold w-6 lg:w-8 text-center">
                        {item.quantity}
                    </span>
                    <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 font-bold text-lg lg:text-xl"
                    >
                        +
                    </button>
                </div>

                {/* Note */}
                <div className="flex-1 px-2 lg:px-4 min-w-0">
                    {editingNoteId === item.id ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={tempNote}
                                onChange={(e) => onTempNoteChange(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onSaveNote(item.id)}
                                className="w-full text-xs lg:text-sm border-b-2 border-blue-500 outline-none bg-transparent"
                                placeholder="..."
                            />
                            <button onClick={() => onSaveNote(item.id)} className="text-green-600">
                                <Save size={16} />
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={() => onStartEditNote(item)}
                            className="text-xs lg:text-sm text-gray-400 cursor-pointer hover:text-blue-600 flex items-center gap-1 overflow-hidden whitespace-nowrap"
                        >
                            <Pencil size={12} />
                            {item.note ? (
                                <span className="text-blue-600 font-medium truncate">{item.note}</span>
                            ) : (
                                'Note'
                            )}
                        </div>
                    )}
                </div>

                {/* Discount Button */}
                <button
                    onClick={() => onOpenDiscount(item)}
                    className={`p-1 lg:p-2 rounded-lg transition ${(item.discountAmount || 0) > 0
                            ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                            : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'
                        }`}
                >
                    <Tag size={18} />
                </button>

                {/* Remove */}
                <button
                    onClick={() => onRemove(item.id)}
                    className="text-red-300 hover:text-red-500 p-1"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
