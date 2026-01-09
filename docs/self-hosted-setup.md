# Self-Hosted Supabase บน minipc - คู่มือติดตั้ง

## ขั้นตอน 1: ติดตั้ง Docker Desktop

1. ดาวน์โหลด Docker Desktop: https://www.docker.com/products/docker-desktop/
2. ติดตั้งและ restart เครื่อง
3. เปิด Docker Desktop แล้วรอให้ "Docker is running"

> [!IMPORTANT]
> ถ้าถามให้เปิด WSL2 ให้กด "Enable WSL2"

---

## ขั้นตอน 2: ดาวน์โหลด Supabase Docker

เปิด **PowerShell** หรือ **Terminal** แล้วรันทีละคำสั่ง:

```powershell
# สร้าง folder สำหรับ Supabase
cd C:\
mkdir supabase-server
cd supabase-server

# ดาวน์โหลด docker-compose
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy ไฟล์ config
copy .env.example .env
```

---

## ขั้นตอน 3: แก้ไข Config

เปิดไฟล์ `C:\supabase-server\supabase\docker\.env` แล้วแก้ไข:

```bash
# เปลี่ยน password (สำคัญมาก!)
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
ANON_KEY=<จะต้อง generate>
SERVICE_ROLE_KEY=<จะต้อง generate>

# URL (สำหรับ Cloudflare Tunnel ทีหลัก)
SITE_URL=http://localhost:3000
API_EXTERNAL_URL=http://localhost:54321
```

---

## ขั้นตอน 4: รัน Supabase

```powershell
cd C:\supabase-server\supabase\docker
docker compose up -d
```

รอสักครู่ (~2-5 นาที ครั้งแรก)

**เช็คว่าทำงาน:**
- เปิด browser ไป http://localhost:54323 (Supabase Studio)
- Default login: Email: `supabase` / Password: `this_password_is_insecure_and_should_be_updated`

---

## ขั้นตอนถัดไป

เมื่อติดตั้ง Docker และรัน Supabase ได้แล้ว บอกผมครับ จะช่วย:
1. Generate JWT keys
2. Migrate ข้อมูลจาก Cloud
3. ตั้งค่า Cloudflare Tunnel
