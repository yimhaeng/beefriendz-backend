# ⚠️ สำคัญ: ค้นหาและใช้ Supabase Cloud URL

ตอนนี้ `.env` ของคุณใช้ **Supabase Local** (`http://localhost:8000`) ซึ่งใช้ได้แค่บนเครื่องคุณเท่านั้น

**สำหรับ Render (production) ต้องใช้ Supabase Cloud URL**

---

## วิธีหา Supabase Cloud URL และ Key

### Option 1: ถ้ามี Supabase Project อยู่แล้ว

1. เข้า https://supabase.com/dashboard
2. เลือก Project ของคุณ
3. ไปที่ **Settings** → **API**
4. คัดลอก:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGci...` (key ยาวๆ)

### Option 2: ถ้ายังไม่มี Supabase Project

1. เข้า https://supabase.com → Sign up/Login
2. คลิก **New Project**
3. ตั้งค่า:
   - **Name:** BeeFriendz
   - **Database Password:** ตั้งรหัสผ่าน (จดไว้)
   - **Region:** Southeast Asia (Singapore)
4. คลิก **Create new project** (รอ 2-3 นาที)
5. หลัง setup เสร็จ → ทำตาม Option 1

---

## ขั้นตอนที่ต้องทำก่อน Deploy Render

### 1. อัพเดท `.env` สำหรับ local development (optional)

แก้ไฟล์ `backend_test/.env`:

```dotenv
# Supabase Cloud Configuration (สำหรับ production)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 2. Migrate Database Schema ไป Supabase Cloud

ถ้าคุณมี schema/tables ใน local Supabase ต้องสร้างใหม่บน cloud:

1. เปิดไฟล์ `DATABASE_SETUP.sql` (ถ้ามี)
2. เข้า Supabase Dashboard → **SQL Editor**
3. Copy-paste SQL และรัน

หรือถ้าไม่มี SQL file:

1. เข้า Supabase Dashboard → **Table Editor**
2. สร้าง tables: `users`, `groups`, `group_members` ด้วยมือ

---

## เมื่อได้ Supabase Cloud URL แล้ว

ใช้ค่าเหล่านี้ใน **Render Environment Variables**:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_KEY = eyJhbGci... (anon public key)
```

แล้วทำตามขั้นตอนใน `RENDER_DEPLOY_GUIDE.md` ได้เลย!

---

**หมายเหตุ:** `.env` ไม่ถูก commit ไป GitHub (มีใน `.gitignore` แล้ว) — ปลอดภัย ✅
