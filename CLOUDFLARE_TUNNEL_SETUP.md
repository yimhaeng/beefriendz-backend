# 🚇 Cloudflare Tunnel Setup Guide

## ✅ สิ่งที่ทำเสร็จแล้ว

- ✅ ติดตั้ง `cloudflared` แล้ว
- ✅ Tunnel ทดสอบแล้ว URL ล่าสุด: `https://taxes-seminars-closure-wildlife.trycloudflare.com`

---

## 📝 ขั้นตอนถัดไป (ทำด้วยตัวเอง)

### ขั้นตอนที่ 1: เปิด Cloudflare Tunnel (ค้างไว้)

เปิด **PowerShell terminal ใหม่** แล้วรันคำสั่งนี้ (ปล่อยทิ้งไว้ ห้ามปิด):

```powershell
cloudflared tunnel --url http://localhost:8000
```

จะขึ้นข้อความ:

```
Your quick Tunnel has been created! Visit it at:
https://xxxxxx.trycloudflare.com
```

**จด URL นี้ไว้ให้ดี!** (จะใช้ในขั้นต่อไป)

---

### ขั้นตอนที่ 2: ทดสอบ Supabase API ผ่าน Tunnel

เปิด PowerShell **terminal ใหม่อีกอัน** แล้วทดสอบ:

```powershell
# แทน xxxxxx ด้วย URL ที่ได้จากข้อ 1
curl https://xxxxxx.trycloudflare.com/rest/v1/users
```

**ผลลัพธ์ที่คาดหวัง:**

- ถ้าได้ JSON array `[]` หรือ `[{"user_id":...}]` → ✅ สำเร็จ
- ถ้าได้ `{"message":"Unauthorized"}` → ✅ ก็ถือว่าทำงาน (แค่ไม่มี auth header)
- ถ้า error อื่นๆ → ❌ ตรวจสอบว่า Supabase local รันอยู่หรือไม่

---

### ขั้นตอนที่ 3: อัพเดท Backend Environment Variables

แก้ไฟล์ `backend_test/.env`:

```dotenv
# Supabase via Cloudflare Tunnel
SUPABASE_URL=https://xxxxxx.trycloudflare.com
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU5MjUxNjAwLCJleHAiOjE5MTcwMTgwMDB9.AfBhSWYE9ZF9rD2MwsJDqO-yQECka-rwI_qvVyP893Y

PORT=3000
NODE_ENV=development
```

**⚠️ แทน `xxxxxx` ด้วย Tunnel URL ของคุณ!**

---

### ขั้นตอนที่ 4: ทดสอบ Backend บนเครื่อง

```powershell
cd 'C:\Users\user\OneDrive\เดสก์ท็อป\BeeFriendz\backend_test'
npm run dev
```

ควรเห็น:

```
🚀 Server is running on http://localhost:3000
📊 Supabase connected: Yes
```

ทดสอบ:

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/api/users
```

---

### ขั้นตอนที่ 5: Deploy Backend ไป Render

ทำตาม `RENDER_DEPLOY_GUIDE.md` แต่ใช้ **Cloudflare Tunnel URL** ใน environment variables:

**Render Environment Variables:**

```
NODE_ENV = production
PORT = 3000
SUPABASE_URL = https://xxxxxx.trycloudflare.com
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ สำคัญ:** ต้อง**เปิด Cloudflare Tunnel ค้างไว้ตลอด**เวลา ไม่งั้น Render จะเชื่อม Supabase ไม่ได้!

---

### ขั้นตอนที่ 6: Setup Named Tunnel (ป้องกัน URL เปลี่ยน)

ถ้าไม่อยากให้ Tunnel URL เปลี่ยนทุกครั้งรีสตาร์ท:

```powershell
# Login Cloudflare (จะเปิดเบราว์เซอร์)
cloudflared tunnel login

# สร้าง named tunnel
cloudflared tunnel create beefriendz-supabase

# จะได้ Tunnel ID และไฟล์ credentials
# จด Tunnel ID ไว้

# สร้าง config file
New-Item -Path "$env:USERPROFILE\.cloudflared" -ItemType Directory -Force
@"
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\user\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: beefriendz-db.yourname.com
    service: http://localhost:8000
  - service: http_status:404
"@ | Out-File -FilePath "$env:USERPROFILE\.cloudflared\config.yml" -Encoding UTF8

# รัน named tunnel
cloudflared tunnel run beefriendz-supabase
```

**ข้อดี:** URL ไม่เปลี่ยน  
**ข้อเสีย:** ต้อง setup DNS (ซับซ้อนกว่า)

---

## 🔧 ทางเลือก: ใช้ ngrok แทน Cloudflare

ถ้าอยากได้ static subdomain:

```powershell
# ต้องสมัคร ngrok account (ฟรี)
ngrok http 8000 --subdomain beefriendz-db
```

จะได้: `https://beefriendz-db.ngrok.io` (ไม่เปลี่ยน)

---

## ⚠️ สิ่งที่ต้องจำ

1. **Tunnel ต้องเปิดค้างไว้ตลอด** — ถ้าปิดเครื่อง/ปิด tunnel → backend บน Render จะเชื่อม database ไม่ได้
2. **URL อาจเปลี่ยน** (ถ้าใช้ quick tunnel) → ต้องอัพเดท Render env vars ใหม่
3. **n8n ยังใช้ `localhost:8000` ได้ปกติ** — ไม่กระทบ

---

## 🎯 Checklist

- [ ] เปิด Cloudflare Tunnel และจด URL
- [ ] ทดสอบ Supabase API ผ่าน tunnel
- [ ] อัพเดท `backend_test/.env`
- [ ] ทดสอบ backend บนเครื่อง
- [ ] Deploy backend ไป Render (ใส่ Tunnel URL)
- [ ] อัพเดท Frontend env var (Render URL)
- [ ] ทดสอบ LIFF sign-in ใน LINE app

---

ถ้ามีปัญหาหรือข้อสงสัย บอกผมได้เลยครับ!
