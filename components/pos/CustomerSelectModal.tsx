'use client';

import React, { useState } from 'react';
import { User, Search, X, Check, UserPlus } from 'lucide-react';
import Modal from '../common/Modal';
import { Customer } from '../../types';

interface CustomerSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    selectedCustomer: Customer | null;
    onSelect: (customer: Customer | null) => void;
    onAddCustomer: (name: string, nickname: string) => Promise<void>;
}

export default function CustomerSelectModal({
    isOpen,
    onClose,
    customers,
    selectedCustomer,
    onSelect,
    onAddCustomer
}: CustomerSelectModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [newName, setNewName] = useState('');
    const [newNickname, setNewNickname] = useState('');
    const [adding, setAdding] = useState(false);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nickname && c.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (customer: Customer | null) => {
        onSelect(customer);
        onClose();
        setSearchTerm('');
    };

    const handleAdd = async () => {
        if (!newNickname && !newName) {
            alert('กรุณาใส่ชื่อลูกค้า');
            return;
        }
        setAdding(true);
        try {
            await onAddCustomer(newName || newNickname, newNickname);
            setNewName('');
            setNewNickname('');
        } catch (error: any) {
            alert('เพิ่มลูกค้าไม่สำเร็จ: ' + error.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="เลือกลูกค้า"
            titleIcon={<User />}
            headerColor="bg-orange-100 !text-orange-800"
            size="lg"
        >
            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อเล่น หรือ ชื่อจริง..."
                        className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Customer List */}
            <div className="max-h-[40vh] overflow-y-auto mb-4 space-y-2">
                {/* ลูกค้าทั่วไป */}
                <div
                    onClick={() => handleSelect(null)}
                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between border-2 transition ${!selectedCustomer
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-transparent hover:bg-gray-100'
                        }`}
                >
                    <div className="font-bold">ลูกค้าทั่วไป (ไม่ระบุ)</div>
                    {!selectedCustomer && <Check className="text-orange-500" />}
                </div>

                {/* Customers */}
                {filteredCustomers.map(cust => (
                    <div
                        key={cust.id}
                        onClick={() => handleSelect(cust)}
                        className={`p-3 rounded-xl cursor-pointer flex items-center justify-between border-2 transition ${selectedCustomer?.id === cust.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-transparent hover:bg-gray-100'
                            }`}
                    >
                        <div>
                            <div className="font-bold text-lg">{cust.nickname || cust.name}</div>
                            {cust.nickname && <div className="text-sm text-gray-500">{cust.name}</div>}
                        </div>
                        {selectedCustomer?.id === cust.id && <Check className="text-orange-500" />}
                    </div>
                ))}
            </div>

            {/* Add Customer Form */}
            <div className="bg-gray-50 p-4 rounded-xl border">
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase">เพิ่มลูกค้าใหม่ด่วน</div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="ชื่อเล่น *"
                        className="flex-1 border p-2 rounded-lg outline-none"
                        value={newNickname}
                        onChange={e => setNewNickname(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="ชื่อจริง"
                        className="flex-1 border p-2 rounded-lg outline-none"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={adding || (!newNickname && !newName)}
                        className="bg-green-600 text-white p-2 rounded-lg disabled:bg-gray-300 hover:bg-green-700 transition"
                    >
                        <UserPlus />
                    </button>
                </div>
            </div>
        </Modal>
    );
}
