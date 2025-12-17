import type { Metadata } from 'next';
import { Pridi } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar'; // เรียก Sidebar มาใช้

const pridi = Pridi({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-pridi',
});

export const metadata: Metadata = {
  title: 'ร้านปุ๋ยการเกษตร POS',
  description: 'ระบบขายหน้าร้านสำหรับร้านปุ๋ย',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${pridi.className} bg-gray-100`}>
        <div className="flex min-h-screen">

          {/* ส่วนที่ 1: Sidebar เมนูซ้าย */}
          <Sidebar />

          {/* ส่วนที่ 2: เนื้อหาหลัก (ขยับหลบเมนูด้วย lg:ml-64) */}
          <main className="flex-1 lg:ml-64 mb-16 lg:mb-0">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}