# POS System Launcher

## วิธีใช้งาน

### 1. แก้ไข URL ใน `POS-Launcher.bat`
เปิดไฟล์ `POS-Launcher.bat` แล้วแก้ไขบรรทัดนี้:
```batch
set POS_URL=https://your-pos-url.vercel.app
```
เปลี่ยนเป็น URL จริงของระบบ POS ของคุณ

### 2. สร้าง Shortcut บน Desktop

1. คลิกขวาที่ไฟล์ `POS-Launcher.bat`
2. เลือก **Send to** → **Desktop (create shortcut)**
3. คลิกขวาที่ Shortcut บน Desktop → **Properties**
4. เปลี่ยนไอคอนได้ตามชอบ (ถ้าต้องการ)
5. เปลี่ยนชื่อเป็น **POS ร้านปุ๋ย** หรือชื่อที่ต้องการ

### 3. เปิดใช้งาน

ดับเบิลคลิกที่ Shortcut → ระบบจะ:
1. เปิด Print Server อัตโนมัติ (สำหรับลิ้นชัก)
2. เปิด Chrome ในโหมด App (ดูเหมือน native app ไม่มี address bar)

---

## ทำให้เปิดอัตโนมัติตอนเปิดเครื่อง (ถ้าต้องการ)

1. กด `Win + R` พิมพ์ `shell:startup` แล้วกด Enter
2. Copy shortcut ไปวางใน folder ที่เปิดมา
3. ทีนี้เปิดเครื่องมาก็จะเปิด POS อัตโนมัติ!

---

## หมายเหตุ

- **Print Server** จะรันอยู่เบื้องหลัง (minimized)
- หยุด server โดยปิดหน้าต่าง CMD สีดำที่ minimize อยู่
- ถ้าใช้ **Microsoft Edge** แทน Chrome ให้แก้ไขใน bat file:
  ```batch
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%POS_URL%" --start-fullscreen
  ```
