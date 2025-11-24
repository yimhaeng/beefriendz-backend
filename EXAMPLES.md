# Example Usage of BeeFriendz Backend API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
PORT=3000
```

3. Start the server:

```bash
npm run dev
```

## API Examples

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "Server is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Get All Users (example table)

```bash
curl http://localhost:3000/api/data/users
```

### 3. Get Specific User by ID

```bash
curl http://localhost:3000/api/data/users/1
```

### 4. Create New User

```bash
curl -X POST http://localhost:3000/api/data/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### 5. Update User

```bash
curl -X PUT http://localhost:3000/api/data/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe"
  }'
```

### 6. Delete User

```bash
curl -X DELETE http://localhost:3000/api/data/users/1
```

## Notes

- Replace `users` with your actual table name in Supabase
- Make sure your Supabase table exists before making requests
- The API uses generic routing, so it works with any table name

## Troubleshooting

- **Connection Error**: Check your SUPABASE_URL and SUPABASE_ANON_KEY
- **Table Not Found**: Verify the table exists in your Supabase project
- **CORS Issues**: CORS is enabled for all origins by default (modify in server.js for production)

## LIFF Example (client-side)

ตัวอย่างโค้ดที่รันภายใน LIFF (หรือหน้าเว็บที่ฝัง LIFF) เพื่อเรียกข้อมูลผู้ใช้จาก backend:

```javascript
// ปรับเป็น URL ของ backend ของคุณ หาก LIFF ใช้ origin เดียวกัน สามารถใช้ relative path เช่น '/api/users'
const API_BASE = "https://your-backend.example.com"; // <-- แก้เป็น URL จริงของคุณ

async function fetchUsers() {
  const res = await fetch(`${API_BASE}/api/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

// ตัวอย่างการเรียกและแสดงผลแบบง่ายๆ
async function renderUsers() {
  try {
    const users = await fetchUsers();
    const listEl = document.getElementById("usersList");
    listEl.innerHTML = users
      .map(
        (u) => `
      <li>
        <strong>${u.name}</strong> (user_id: ${u.user_id})<br />
        line_id: ${u.line_id} • group_id: ${u.group_id}
      </li>
    `
      )
      .join("");
  } catch (err) {
    console.error(err);
    document.getElementById("usersList").textContent = "Error loading users";
  }
}

// เรียกเมื่อโหลด LIFF
document.addEventListener("DOMContentLoaded", () => {
  renderUsers();
});
```

หมายเหตุ:

- หาก LIFF ของคุณรันในหน้าเว็บที่ไม่ใช่ origin เดียวกับ backend ให้ตั้งค่า `API_BASE` เป็น full URL และตรวจสอบว่า backend อนุญาต origin ดังกล่าวใน CORS
- คุณอาจอยากใช้ endpoint เฉพาะ เช่น `/api/users/line/:line_id` เพื่อดึงข้อมูลผู้ใช้ที่เข้าสู่ระบบตาม `line_id` จาก LIFF
