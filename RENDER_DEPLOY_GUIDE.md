# 🚀 Deploy Backend to Render

## ขั้นตอนที่ 1: Push Code ไป GitHub

```powershell
# ใน backend_test folder
cd 'C:\Users\user\OneDrive\เดสก์ท็อป\BeeFriendz\backend_test'

# ถ้ายังไม่มี git init
git init
git add .
git commit -m "Initial backend commit for Render deploy"

# เชื่อม GitHub repo (ใช้ repo เดิมหรือสร้างใหม่)
git remote add origin https://github.com/yimhaeng/beefriendz.git
git branch -M main
git push -u origin main
```

**หมายเหตุ:** ถ้า repo มีอยู่แล้ว ให้ push เข้า branch ใหม่หรือ merge เข้า main

---

## ขั้นตอนที่ 2: สร้าง Web Service บน Render

### 2.1 ไปที่ Render Dashboard

1. เข้า https://render.com
2. Sign up/Login (แนะนำใช้ GitHub account)
3. คลิก **New +** → **Web Service**

### 2.2 เชื่อมต่อ GitHub Repository

1. เลือก **Connect GitHub** (ถ้ายังไม่เชื่อม)
2. Authorize Render เข้าถึง repo ของคุณ
3. เลือก repository: **yimhaeng/beefriendz**
4. คลิก **Connect**

### 2.3 ตั้งค่า Web Service

**Basic Settings:**

- **Name:** `beefriendz-backend` (หรือชื่ออื่นที่ต้องการ)
- **Region:** Singapore (ใกล้ที่สุด)
- **Branch:** `main`
- **Root Directory:** `backend_test` ⚠️ สำคัญมาก!
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Instance Type:**

- เลือก **Free** ($0/month)

**Environment Variables:**
คลิก **Add Environment Variable** และเพิ่ม:

| Key            | Value                  |
| -------------- | ---------------------- |
| `NODE_ENV`     | `production`           |
| `PORT`         | `3000`                 |
| `SUPABASE_URL` | `<ค่าจาก .env ของคุณ>` |
| `SUPABASE_KEY` | `<ค่าจาก .env ของคุณ>` |

**Auto-Deploy:**

- เปิด **Auto-Deploy** (deploy อัตโนมัติเมื่อ push code)

### 2.4 Deploy

1. คลิก **Create Web Service**
2. Render จะ build และ deploy ให้อัตโนมัติ (ใช้เวลา 2-5 นาที)

---

## ขั้นตอนที่ 3: รอ Deploy เสร็จ

ดู logs ใน Render Dashboard:

- ควรเห็น `🚀 Server is running on http://localhost:3000`
- ควรเห็น `📊 Supabase connected: Yes`

**Backend URL ของคุณ:**

```
https://beefriendz-backend.onrender.com
```

(URL จริงจะแสดงใน Render Dashboard)

---

## ขั้นตอนที่ 4: ทดสอบ Backend

```powershell
# ทดสอบ health endpoint
curl https://beefriendz-backend.onrender.com/health
```

**คาดหวัง:**

```json
{
  "status": "Server is running",
  "timestamp": "2025-11-24T..."
}
```

---

## ขั้นตอนที่ 5: อัพเดท Frontend ให้ใช้ Render URL

```powershell
cd 'C:\Users\user\OneDrive\เดสก์ท็อป\BeeFriendz\beefriendz_LiFF'

# เพิ่ม/แก้ Vercel environment variable
vercel env add NEXT_PUBLIC_API_URL production
# ใส่: https://beefriendz-backend.onrender.com

# Redeploy frontend
vercel --prod
```

หรือทำผ่าน Vercel Dashboard:

1. เข้า https://vercel.com/yimhaeng/beefriendz-li-ff
2. Settings → Environment Variables
3. แก้ `NEXT_PUBLIC_API_URL` เป็น: `https://beefriendz-backend.onrender.com`
4. Redeploy

---

## ขั้นตอนที่ 6: ทดสอบ End-to-End

1. เปิด `https://liff.line.me/2008277186-xq681oX3` ใน LINE app
2. กด Sign in
3. ดู Render logs → ควรเห็น:
   ```
   [2025-11-24T...] POST /api/users - body: {"line_user_id":"U..."}
   [2025-11-24T...] POST /api/users -> 201 (34ms)
   ```

---

## 🔧 การจัดการ Render (หลัง Deploy)

### ดู Logs

- Render Dashboard → เลือก service → **Logs** tab

### Redeploy Manual

- Render Dashboard → **Manual Deploy** → **Deploy latest commit**

### ตั้งค่า Keep-Alive (ป้องกัน Sleep)

**Option A: Cron-job.org**

1. เข้า https://cron-job.org → Sign up (ฟรี)
2. สร้าง Cronjob:
   - **URL:** `https://beefriendz-backend.onrender.com/health`
   - **Schedule:** Every 14 minutes
   - **Enable notifications:** Off
3. Save

**Option B: UptimeRobot**

1. เข้า https://uptimerobot.com → Sign up (ฟรี)
2. Add New Monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://beefriendz-backend.onrender.com/health`
   - **Monitoring Interval:** 5 minutes
3. Create Monitor

---

## ⚠️ Free Tier Limitations

- **Sleep:** หลัง 15 นาทีไม่มี request → sleep
- **Cold start:** request แรกหลัง sleep ใช้เวลา 30-60 วินาที
- **Bandwidth:** 100 GB/month
- **Build hours:** 500 minutes/month

**หมายเหตุ:** Retry logic ที่เพิ่มใน `userApi.ts` จะช่วยจัดการ cold start อัตโนมัติ

---

## 🎯 Checklist

- [ ] Push backend code ไป GitHub
- [ ] สร้าง Web Service บน Render
- [ ] ตั้ง Root Directory = `backend_test`
- [ ] เพิ่ม Environment Variables (SUPABASE_URL, SUPABASE_KEY)
- [ ] Deploy และรอให้เสร็จ
- [ ] ทดสอบ health endpoint
- [ ] อัพเดท Vercel env var → Render URL
- [ ] Redeploy frontend
- [ ] ทดสอบ LIFF sign-in ใน LINE app
- [ ] (Optional) Setup keep-alive service

---

ถ้ามีปัญหาตรงไหน บอกผมได้เลยครับ!
