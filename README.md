# BeeFriendz Backend

Backend API สำหรับ BeeFriendz ที่เชื่อมต่อกับ Supabase

## วิธีการตั้งค่า

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. สร้างไฟล์ .env

สร้างไฟล์ `.env` จากไฟล์ `.env.example` และกรอกข้อมูล Supabase ของคุณ:

```bash
cp .env.example .env
```

จากนั้นแก้ไข `.env` และกรอก:

- `SUPABASE_URL` - URL ของโปรเจ็กต์ Supabase
- `SUPABASE_ANON_KEY` - Anonymous key จากการตั้งค่า Supabase
- `PORT` - Port ที่ต้องการให้ server ทำงาน (ค่าเริ่มต้น: 3000)

### 3. รันเซิร์ฟเวอร์

#### การพัฒนา (Development mode):

```bash
npm run dev
```

#### Production mode:

```bash
npm start
```

## โครงสร้างของโปรเจ็กต์

```
src/
├── config/           # ไฟล์กำหนดค่า
│   └── supabase.js  # Supabase client initialization
├── routes/          # API routes
│   └── index.js     # Route definitions
├── controllers/     # Business logic
└── models/          # Data models
server.js            # Entry point
```

## API Endpoints

### ตัวอย่าง Endpoints

- `GET /api/data` - ดึงข้อมูลทั้งหมด
- `POST /api/data` - สร้างข้อมูลใหม่
- `GET /api/data/:id` - ดึงข้อมูลตาม ID
- `PUT /api/data/:id` - แก้ไขข้อมูล
- `DELETE /api/data/:id` - ลบข้อมูล

## หมายเหตุ

- ตรวจสอบให้แน่ใจว่า Supabase URL และ key ถูกต้อง
- ควรใช้ environment variables สำหรับข้อมูล sensitive

## พัฒนาเพิ่มเติม

หากต้องการเพิ่มฟีเจอร์ใหม่:

1. สร้าง route ใน `src/routes/`
2. เขียน controller ใน `src/controllers/`
3. เพิ่ม API endpoint และทดสอบ
