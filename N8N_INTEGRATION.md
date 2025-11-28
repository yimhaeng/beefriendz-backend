# N8N Integration Guide for BeeFriendz

## Overview

คู่มือนี้จะแนะนำวิธีการตั้งค่า n8n workflows สำหรับระบบ BeeFriendz

---

## 🔧 API Endpoints สำหรับ n8n

### Base URL

```
https://beefriendz-backend.onrender.com/api
```

---

## 📋 1. อ่านข้อมูลทั้งหมด (Read Operations)

### 1.1 ดึงข้อมูลโปรเจกต์ทั้งหมดในกลุ่ม

```http
GET /api/projects/group/:groupId
```

**Response:**

```json
[
  {
    "project_id": 12,
    "project_name": "BeeFriendz App",
    "description": "...",
    "start_date": "2025-11-20",
    "end_date": "2025-12-31",
    "group_id": 11,
    "created_at": "2025-11-27T...",
    "updated_at": "2025-11-27T..."
  }
]
```

### 1.2 ดึงข้อมูลงานทั้งหมดในโปรเจกต์

```http
GET /api/tasks/project/:projectId
```

**Response:**

```json
[
  {
    "task_id": 28,
    "task_name": "ออกแบบ UI/UX",
    "description": "...",
    "status": "in_progress",
    "priority": "high",
    "deadline": "2025-11-30",
    "phase": "ออกแบบ",
    "assigned_to": 1,
    "assigned_user": {
      "user_id": 1,
      "display_name": "สมชาย",
      "picture_url": "..."
    },
    "project": {
      "project_id": 12,
      "project_name": "BeeFriendz App"
    }
  }
]
```

### 1.3 ดึงงานที่ใกล้ถึง deadline

```http
GET /api/tasks/near-deadline?days=2
```

**Query Parameters:**

- `days` (optional): จำนวนวันล่วงหน้า (default: 2)

**Response:**

```json
[
  {
    "task_id": 30,
    "task_name": "ทดสอบระบบ",
    "deadline": "2025-11-30",
    "status": "in_progress",
    "assigned_user": {
      "user_id": 1,
      "display_name": "สมชาย",
      "line_user_id": "U1234..."
    },
    "project": {
      "project_id": 12,
      "project_name": "BeeFriendz App",
      "groups": {
        "line_group_id": "C1234..."
      }
    }
  }
]
```

### 1.4 ดึง Activity Logs ของโปรเจกต์

```http
GET /api/projects/:projectId/logs
```

**Response:**

```json
[
  {
    "log_id": 113,
    "project_id": 12,
    "task_id": 28,
    "user_id": 1,
    "action_type": "status_change",
    "description": "เปลี่ยนสถานะจาก submitted เป็น completed",
    "old_value": "submitted",
    "new_value": "completed",
    "created_at": "2025-11-28T09:07:07.892817",
    "user": {
      "display_name": "สมชาย"
    }
  }
]
```

### 1.5 ดึงข้อมูลกลุ่มทั้งหมด

```http
GET /api/groups
```

### 1.6 ดึงสมาชิกในกลุ่ม

```http
GET /api/group-members/group/:groupId
```

**Response:**

```json
[
  {
    "id": 15,
    "group_id": 11,
    "user_id": 1,
    "role": "leader",
    "joined_at": "2025-11-27T...",
    "users": {
      "user_id": 1,
      "display_name": "สมชาย",
      "line_user_id": "U1234...",
      "picture_url": "..."
    }
  }
]
```

---

## ✏️ 2. อัปเดตสถานะงาน (Update Operations)

### 2.1 อัปเดตสถานะงาน

```http
PUT /api/tasks/:taskId
```

**Request Body:**

```json
{
  "status": "completed",
  "updated_by": 1
}
```

**Status Values:**

- `todo` - รอดำเนินการ
- `in_progress` - กำลังทำ
- `reviewing` - รอตรวจสอบ
- `submitted` - รอหัวหน้าอนุมัติ
- `completed` - เสร็จสิ้น

**Response:**

```json
{
  "task_id": 28,
  "status": "completed",
  "updated_at": "2025-11-28T..."
}
```

**หมายเหตุ:**

- การเปลี่ยนสถานะจะส่ง Flex Message แจ้งเตือนไปกลุ่ม LINE อัตโนมัติ
- ระบบจะสร้าง Activity Log อัตโนมัติ

### 2.2 อัปเดตข้อมูลงาน (ทั่วไป)

```http
PUT /api/tasks/:taskId
```

**Request Body:**

```json
{
  "task_name": "ชื่องานใหม่",
  "description": "รายละเอียด",
  "deadline": "2025-12-15",
  "priority": "high",
  "assigned_to": 2,
  "updated_by": 1
}
```

---

## ⏰ 3. Cron Job - แจ้งเตือนงานใกล้ถึง Deadline

### 3.1 ส่งแจ้งเตือน Deadline (สำหรับ n8n Cron)

```http
POST /api/tasks/send-deadline-reminders
```

**Request Body:**

```json
{
  "days": 2
}
```

**Response:**

```json
{
  "success": true,
  "totalTasks": 5,
  "groupsNotified": 2,
  "results": [
    {
      "lineGroupId": "C1234...",
      "tasksCount": 3,
      "success": true
    },
    {
      "lineGroupId": "C5678...",
      "tasksCount": 2,
      "success": true
    }
  ]
}
```

**การทำงาน:**

1. ดึงงานที่มี deadline ใน X วันข้างหน้า
2. จัดกลุ่มงานตาม LINE Group ID
3. ส่ง Flex Message Carousel แจ้งเตือนไปแต่ละกลุ่ม
4. แต่ละ bubble แสดง: ชื่องาน, โปรเจกต์, เดดไลน์, ผู้รับผิดชอบ

---

## 🤖 4. ตัวอย่าง n8n Workflows

### 4.1 Workflow: Daily Deadline Reminder

**Node 1: Schedule Trigger**

- Type: `Cron`
- Expression: `0 9 * * *` (ทุกวันเวลา 09:00)

**Node 2: HTTP Request**

- Method: `POST`
- URL: `https://beefriendz-backend.onrender.com/api/tasks/send-deadline-reminders`
- Headers:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- Body:
  ```json
  {
    "days": 2
  }
  ```

**Node 3: Set (Optional - Log Results)**

- Store response for monitoring

---

### 4.2 Workflow: Auto Status Update from Form

**Node 1: Webhook**

- Method: `POST`
- Path: `/update-task-status`

**Node 2: HTTP Request**

- Method: `PUT`
- URL: `https://beefriendz-backend.onrender.com/api/tasks/{{$json["taskId"]}}`
- Body:
  ```json
  {
    "status": "{{$json["newStatus"]}}",
    "updated_by": "{{$json["userId"]}}"
  }
  ```

---

### 4.3 Workflow: Monitor Overdue Tasks

**Node 1: Schedule Trigger**

- Expression: `0 10 * * *` (ทุกวันเวลา 10:00)

**Node 2: HTTP Request - Get Near Deadline**

- Method: `GET`
- URL: `https://beefriendz-backend.onrender.com/api/tasks/near-deadline?days=0`

**Node 3: Filter (IF)**

- Condition: `{{$json["length"]}} > 0`

**Node 4: HTTP Request - Send Urgent Reminder**

- Method: `POST`
- URL: `https://beefriendz-backend.onrender.com/api/tasks/send-deadline-reminders`
- Body: `{"days": 0}`

---

## 📊 5. Flex Message Formats

### 5.1 Status Update Notification

```
╔═══════════════════════════╗
║ ✅ อัปเดตสถานะงาน        ║
╠═══════════════════════════╣
║ ออกแบบ UI/UX             ║
║ โปรเจกต์: BeeFriendz App  ║
║ ─────────────────────     ║
║ สถานะเดิม: 🔄 กำลังทำ    ║
║ สถานะใหม่: ✅ เสร็จสิ้น   ║
║ ผู้รับผิดชอบ: สมชาย       ║
║ อัปเดตโดย: หัวหน้า        ║
╠═══════════════════════════╣
║  [📋 ดูโปรเจกต์]          ║
╚═══════════════════════════╝
```

### 5.2 Deadline Reminder (Carousel)

```
╔═══════════════╗  ╔═══════════════╗  ╔═══════════════╗
║ 🔴 พรุ่งนี้!  ║  ║ 🟡 อีก 2 วัน  ║  ║ 🟢 อีก 3 วัน  ║
╠═══════════════╣  ╠═══════════════╣  ╠═══════════════╣
║ ทดสอบระบบ    ║  ║ เขียน Docs   ║  ║ Code Review  ║
║ 📋 Project A  ║  ║ 📋 Project A  ║  ║ 📋 Project B  ║
║ ─────────────║  ║ ─────────────║  ║ ─────────────║
║ 📅 30 พ.ย.   ║  ║ 📅 1 ธ.ค.    ║  ║ 📅 2 ธ.ค.    ║
║ 👤 สมชาย     ║  ║ 👤 สมหญิง    ║  ║ 👤 สมศรี     ║
╠═══════════════╣  ╠═══════════════╣  ╠═══════════════╣
║ [ดูรายละเอียด]║  ║ [ดูรายละเอียด]║  ║ [ดูรายละเอียด]║
╚═══════════════╝  ╚═══════════════╝  ╚═══════════════╝
```

---

## 🔐 Authentication

ปัจจุบัน API endpoints เหล่านี้ไม่ต้องใช้ authentication แต่ควรเพิ่ม API Key ในอนาคต:

**แนะนำสำหรับ Production:**

```javascript
// Headers
{
  "X-API-Key": "your-secret-key",
  "Content-Type": "application/json"
}
```

---

## 🐛 Error Handling

**ตัวอย่าง Error Response:**

```json
{
  "error": "Task not found"
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## 📝 Best Practices

1. **Cron Jobs:**

   - ตั้งเวลาแจ้งเตือนให้เหมาะสม (แนะนำ 09:00)
   - ใช้ `days=2` สำหรับแจ้งล่วงหน้า
   - ใช้ `days=0` สำหรับงานเร่งด่วน

2. **Rate Limiting:**

   - หลีกเลี่ยงการเรียก API บ่อยเกินไป
   - ใช้ batch operations เมื่อเป็นไปได้

3. **Error Recovery:**

   - เพิ่ม retry logic ใน n8n
   - Log errors สำหรับ debugging

4. **Testing:**
   - ทดสอบด้วย `days=7` ก่อนเพื่อดูว่ามีงานอะไรบ้าง
   - ตรวจสอบ response ว่าส่ง notification สำเร็จ

---

## 🎯 Quick Start Checklist

- [ ] ตั้งค่า n8n instance
- [ ] สร้าง Cron workflow สำหรับแจ้งเตือนรายวัน
- [ ] ทดสอบส่ง deadline reminder
- [ ] ตรวจสอบว่า Flex Message ส่งถูกต้อง
- [ ] Set up error monitoring
- [ ] เพิ่ม webhook สำหรับ auto-update (optional)

---

## 📞 Support

หากมีปัญหาหรือคำถาม:

1. ตรวจสอบ logs ที่ Render.com
2. ทดสอบ API ด้วย Postman/Insomnia
3. เช็ค LINE Channel Access Token

**API Health Check:**

```http
GET /health
```
