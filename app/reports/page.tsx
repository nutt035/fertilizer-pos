'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, CURRENT_BRANCH_ID } from '../../lib/supabase';
import { ArrowLeft, FileSpreadsheet, FileText, Calendar, Download, TrendingUp, Package, Users } from 'lucide-react';
import { exportToExcel, exportToPDF, ExportData, formatNumber } from '../../lib/export';

type ReportType = 'sales' | 'products' | 'customers';

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>('sales');
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(1); // First of month
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<ExportData | null>(null);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let data: ExportData | null = null;

            if (reportType === 'sales') {
                const { data: orders, error } = await supabase
                    .from('orders')
                    .select(`
                        receipt_no,
                        grand_total,
                        payment_method,
                        status,
                        created_at,
                        customers(name)
                    `)
                    .eq('branch_id', CURRENT_BRANCH_ID)
                    .gte('created_at', dateFrom)
                    .lte('created_at', dateTo + 'T23:59:59')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                data = {
                    title: `รายงานยอดขาย ${dateFrom} ถึง ${dateTo}`,
                    headers: ['เลขที่บิล', 'ลูกค้า', 'ยอดรวม', 'ช่องทาง', 'สถานะ', 'วันที่'],
                    rows: (orders || []).map((o: any) => [
                        o.receipt_no,
                        o.customers?.name || 'ลูกค้าทั่วไป',
                        formatNumber(o.grand_total),
                        o.payment_method === 'cash' ? 'เงินสด' : 'โอน',
                        o.status === 'COMPLETED' ? 'สำเร็จ' : 'ยกเลิก',
                        new Date(o.created_at).toLocaleString('th-TH')
                    ])
                };
            } else if (reportType === 'products') {
                const { data: products, error } = await supabase
                    .from('products')
                    .select(`
                        sku,
                        name,
                        cost,
                        price,
                        inventory(quantity),
                        master_categories(name)
                    `)
                    .eq('is_active', true)
                    .eq('inventory.branch_id', CURRENT_BRANCH_ID);

                if (error) throw error;

                data = {
                    title: `รายงานสินค้าคงคลัง ${new Date().toLocaleDateString('th-TH')}`,
                    headers: ['รหัส', 'ชื่อสินค้า', 'หมวดหมู่', 'ทุน', 'ราคาขาย', 'คงเหลือ', 'มูลค่า'],
                    rows: (products || []).map((p: any) => {
                        const stock = p.inventory?.[0]?.quantity || 0;
                        return [
                            p.sku || '-',
                            p.name,
                            p.master_categories?.name || '-',
                            formatNumber(p.cost),
                            formatNumber(p.price),
                            stock,
                            formatNumber(p.price * stock)
                        ];
                    })
                };
            } else if (reportType === 'customers') {
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('total_spent', { ascending: false });

                if (error) throw error;

                data = {
                    title: `รายงานลูกค้า ${new Date().toLocaleDateString('th-TH')}`,
                    headers: ['ชื่อ', 'ชื่อเล่น', 'โทร', 'แต้มสะสม', 'ยอดซื้อรวม'],
                    rows: (customers || []).map((c: any) => [
                        c.name,
                        c.nickname || '-',
                        c.phone || '-',
                        c.points || 0,
                        formatNumber(c.total_spent || 0)
                    ])
                };
            }

            setPreviewData(data);
        } catch (error: any) {
            alert('โหลดข้อมูลไม่สำเร็จ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (previewData) {
            exportToExcel(previewData, `report_${reportType}_${dateFrom}_${dateTo}`);
        }
    };

    const handleExportPDF = () => {
        if (previewData) {
            exportToPDF(previewData, `report_${reportType}_${dateFrom}_${dateTo}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 bg-white p-4 rounded-2xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 lg:px-6 lg:py-3 rounded-xl hover:bg-red-200 transition border-2 border-red-200">
                        <ArrowLeft size={24} /> <span className="text-lg lg:text-2xl font-bold">หน้าร้าน</span>
                    </Link>
                    <h1 className="text-xl lg:text-3xl font-black text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet size={28} className="text-green-600" /> รายงาน
                    </h1>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Report Type */}
                    <div>
                        <label className="block text-gray-600 mb-2 font-bold">ประเภทรายงาน</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setReportType('sales')}
                                className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition ${reportType === 'sales' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <TrendingUp size={20} />
                                ยอดขาย
                            </button>
                            <button
                                onClick={() => setReportType('products')}
                                className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition ${reportType === 'products' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Package size={20} />
                                สินค้า
                            </button>
                            <button
                                onClick={() => setReportType('customers')}
                                className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition ${reportType === 'customers' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Users size={20} />
                                ลูกค้า
                            </button>
                        </div>
                    </div>

                    {/* Date Range */}
                    {reportType === 'sales' && (
                        <>
                            <div>
                                <label className="block text-gray-600 mb-2 font-bold">จากวันที่</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="w-full border-2 p-3 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-2 font-bold">ถึงวันที่</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    className="w-full border-2 p-3 rounded-xl"
                                />
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex items-end gap-2">
                        <button
                            onClick={fetchReportData}
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview & Export */}
            {previewData && (
                <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">{previewData.title}</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700"
                            >
                                <FileSpreadsheet size={20} /> Excel
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700"
                            >
                                <FileText size={20} /> PDF
                            </button>
                        </div>
                    </div>

                    {/* Table Preview */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    {previewData.headers.map((h, i) => (
                                        <th key={i} className="p-3 text-left font-bold">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.rows.slice(0, 20).map((row, i) => (
                                    <tr key={i} className="border-b hover:bg-blue-50">
                                        {row.map((cell, j) => (
                                            <td key={j} className="p-3">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewData.rows.length > 20 && (
                            <div className="text-center py-4 text-gray-500">
                                แสดง 20 รายการแรกจากทั้งหมด {previewData.rows.length} รายการ
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
