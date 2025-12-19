'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function SearchInput({
    value,
    onChange,
    placeholder = 'ค้นหา...',
    className = '',
    autoFocus = false,
    onKeyDown
}: SearchInputProps) {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
                type="text"
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-lg shadow-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={autoFocus}
                onKeyDown={onKeyDown}
            />
        </div>
    );
}
