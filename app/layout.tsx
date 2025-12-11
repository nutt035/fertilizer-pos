import type { Metadata } from 'next';
import { Pridi } from 'next/font/google'; // 1. Import ฟอนต์ Pridi
import './globals.css';

// 2. ตั้งค่าฟอนต์ (เลือกระดับความหนาที่ต้องการ)
const pridi = Pridi({ 
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'], // โหลดมาหลายๆ น้ำหนักเผื่อตัวหนาตัวบาง
  variable: '--font-pridi', // ตั้งชื่อตัวแปรเผื่อใช้ใน Tailwind (Optional)
});

export const metadata: Metadata = {
  title: 'ร้านกิจเจริญเคมีเกษตร',
  description: 'ระบบขายหน้าร้านสำหรับร้านปุ๋ย',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      {/* 3. เรียกใช้ฟอนต์ที่ body */}
      <body className={pridi.className}>{children}</body>
    </html>
  );
}