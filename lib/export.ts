import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export interface ExportData {
    headers: string[];
    rows: (string | number)[][];
    title?: string;
}

/**
 * Export data to Excel file
 */
export function exportToExcel(data: ExportData, filename: string = 'export') {
    const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Auto-width columns
    const maxWidths = data.headers.map((header, i) => {
        const maxLength = Math.max(
            header.length,
            ...data.rows.map(row => String(row[i] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = maxWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF file
 */
export function exportToPDF(data: ExportData, filename: string = 'export') {
    const doc = new jsPDF();

    // Title
    if (data.title) {
        doc.setFontSize(16);
        doc.text(data.title, 14, 20);
    }

    // Table
    doc.autoTable({
        head: [data.headers],
        body: data.rows,
        startY: data.title ? 30 : 20,
        styles: {
            fontSize: 10,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [59, 130, 246], // blue-500
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252], // gray-50
        },
    });

    // Footer with date
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, 14, pageHeight - 10);

    doc.save(`${filename}.pdf`);
}

/**
 * Format number for display
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
