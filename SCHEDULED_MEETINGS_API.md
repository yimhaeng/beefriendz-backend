# Scheduled Meetings API Documentation

## Overview

ระบบจัดเวลาประชุม (นัด) สำหรับกลุ่มใน BeeFriendz

- User พิมพ์นัดใน LINE → N8N LLM parse → บันทึก API
- N8N Cron ตรวจสอบ → ส่ง LINE reminder ก่อนเวลา

---

## Base URL

```
https://beefriendz-backend.onrender.com/api/scheduled-meetings
```

---

## 📅 API Endpoints

### 1. สร้าง/อัพเดท Scheduled Meeting

**Endpoint:** `POST /api/scheduled-meetings`

**Description:**

- สร้าง meeting ใหม่
- ถ้า meeting เดียวกันในวันเดียว → อัพเดทเดิมเท่านั้น (keep only latest)

**Request Body:**

```json
{
  "group_id": 11,
  "creator_id": 1,
  "title": "ประชุมประเมินโปรเจกต์",
  "description": "คุยเรื่องการดำเนินงาน",
  "scheduled_time": "2026-02-25T16:00:00",
  "location": "ห้องประชุมชั้น 2"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "meeting": {
    "meeting_id": 1,
    "group_id": 11,
    "creator_id": 1,
    "title": "ประชุมประเมินโปรเจกต์",
    "description": "คุยเรื่องการดำเนินงาน",
    "scheduled_time": "2026-02-25T16:00:00",
    "location": "ห้องประชุมชั้น 2",
    "status": "pending",
    "created_at": "2026-02-22T10:30:00",
    "updated_at": "2026-02-22T10:30:00",
    "creator": {
      "user_id": 1,
      "display_name": "สมชาย",
      "picture_url": "..."
    },
    "participants": [
      {
        "id": 1,
        "user_id": 2,
        "status": "invited",
        "user": {
          "user_id": 2,
          "display_name": "สมหญิง",
          "picture_url": "..."
        }
      }
    ],
    "group": {
      "group_id": 11,
      "group_name": "BeeFriendz Team",
      "line_group_id": "C1234..."
    }
  }
}
```

**Important Notes:**

- `scheduled_time` ต้องเป็น ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
- System จะ assume เดือนปัจจุบัน ถ้า user บอกแค่วันที่
- Auto add all group members as "invited" (ถ้าเป็น meeting ใหม่)
- ส่ง LINE notification อัตโนมัติ

---

### 2. ดึง Upcoming Meetings (สำหรับ N8N Reminder)

**Endpoint:** `GET /api/scheduled-meetings/upcoming?minutes=15&groupId=11`

**Description:** ดึง meetings ที่จะเริ่มในเวลา X นาทีข้างหน้า (ใช้สำหรับ N8N Cron trigger)

**Query Parameters:**

- `minutes` (optional, default: 15) - จำนวนนาทีข้างหน้า
- `groupId` (optional) - ดึงเฉพาะกลุ่มที่ระบุ

**Response (200 OK):**

```json
{
  "success": true,
  "meetings": [
    {
      "meeting_id": 1,
      "group_id": 11,
      "title": "ประชุมประเมินโปรเจกต์",
      "scheduled_time": "2026-02-25T16:10:00",
      "location": "ห้องประชุมชั้น 2",
      "status": "pending",
      "creator": {
        "user_id": 1,
        "display_name": "สมชาย"
      },
      "participants": [...],
      "group": {
        "group_id": 11,
        "line_group_id": "C1234..."
      }
    }
  ]
}
```

**N8N Usage Example:**

```
ทุก 5 นาที: GET /api/scheduled-meetings/upcoming?minutes=15
→ สำหรับแต่ละ meeting ส่ง LINE reminder
```

---

### 3. ดึง Meetings ของกลุ่ม

**Endpoint:** `GET /api/scheduled-meetings/group/:groupId`

**Description:** ดึง upcoming meetings ทั้งหมดของกลุ่ม

**Response (200 OK):**

```json
{
  "success": true,
  "meetings": [...] // sorted by scheduled_time (ascending)
}
```

---

### 4. ดึง Meeting Details

**Endpoint:** `GET /api/scheduled-meetings/:meetingId`

**Response (200 OK):**

```json
{
  "success": true,
  "meeting": {
    "meeting_id": 1,
    "title": "ประชุมประเมินโปรเจกต์",
    "scheduled_time": "2026-02-25T16:00:00",
    "location": "ห้องประชุมชั้น 2",
    "status": "pending",
    "participants": [
      {
        "id": 1,
        "user_id": 2,
        "status": "invited",
        "joined_at": null,
        "user": {
          "user_id": 2,
          "display_name": "สมหญิง"
        }
      },
      {
        "id": 2,
        "user_id": 3,
        "status": "accepted",
        "joined_at": "2026-02-22T10:35:00",
        "user": {
          "user_id": 3,
          "display_name": "สมเด็จ"
        }
      }
    ]
  }
}
```

---

### 5. ยกเลิกการประชุม

**Endpoint:** `PUT /api/scheduled-meetings/:meetingId/cancel`

**Description:** เปลี่ยนสถานะเป็น "cancelled"

**Request Body:**

```json
{
  "cancelled_reason": "มีความขัดแย้งด้านเวลา" // optional
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Meeting cancelled",
  "meeting": {
    "meeting_id": 1,
    "status": "cancelled",
    "updated_at": "2026-02-22T10:40:00"
  }
}
```

**Notes:**

- ส่ง LINE notification ยกเลิกอัตโนมัติ
- Status เปลี่ยนเป็น "cancelled"

---

### 6. เลื่อนเวลาการประชุม

**Endpoint:** `PUT /api/scheduled-meetings/:meetingId/reschedule`

**Description:** เปลี่ยนเวลาการประชุม

**Request Body:**

```json
{
  "scheduled_time": "2026-02-26T15:00:00",
  "reason": "มีคนไม่ว่างในเวลาเดิม" // optional
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Meeting rescheduled",
  "meeting": {
    "meeting_id": 1,
    "scheduled_time": "2026-02-26T15:00:00",
    "updated_at": "2026-02-22T10:40:00"
  }
}
```

**Notes:**

- ส่ง LINE notification เลื่อนเวลาอัตโนมัติ
- ซีรีส์ participants ยังคงเหมือนเดิม

---

### 7. ยืนยันการเข้าร่วมการประชุม

**Endpoint:** `PUT /api/scheduled-meetings/:meetingId/participants/:userId`

**Description:** User ยืนยันการเข้าร่วม หรือถอนตัว

**Request Body:**

```json
{
  "status": "accepted" // or "declined"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Participant status updated",
  "participant": {
    "id": 1,
    "meeting_id": 1,
    "user_id": 2,
    "status": "accepted",
    "joined_at": "2026-02-22T10:40:00"
  }
}
```

**Status Values:**

- `invited` - พึ่งเชิญ (default)
- `accepted` - ยืนยันเข้าร่วม
- `declined` - ปฏิเสธการเข้าร่วม

---

## 🔄 N8N Workflow Design

### Workflow 1: Parse & Create Meeting (from LINE message)

```
LINE Message from User
    ↓
[Webhook] Receive message
    ↓
[LLM] Extract: date, time, title, location
    ↓
[HTTP] POST /api/scheduled-meetings
    ↓
[Response] Success → Send confirmation to LINE
```

**Example User Input:**

```
"บีนี่คะ วันที่ 25 มีนัดคุยประชุมกันตอน 16:00 น.ค่ะ"
```

**LLM Output (JSON):**

```json
{
  "group_id": 11,
  "creator_id": 1,
  "title": "นัดคุยประชุม",
  "scheduled_time": "2026-02-25T16:00:00",
  "location": null
}
```

---

### Workflow 2: Send Reminder (Cron Job)

```
[Cron] Every 5 minutes
    ↓
[HTTP] GET /api/scheduled-meetings/upcoming?minutes=15
    ↓
For each meeting in response:
    ↓
[HTTP] Send to LINE:
    - Meeting reminder Flex Message
    - Link to Workspace
```

**N8N Cron Expression:**

```
*/5 * * * *  (every 5 minutes)
```

---

## 📊 Database Schema

### scheduled_meetings

```sql
CREATE TABLE scheduled_meetings (
  meeting_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  creator_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id),
  FOREIGN KEY (creator_id) REFERENCES users(user_id),
  INDEX idx_scheduled_time (scheduled_time),
  INDEX idx_group_id (group_id),
  INDEX idx_status (status)
);
```

### meeting_participants

```sql
CREATE TABLE meeting_participants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  meeting_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status ENUM('invited', 'accepted', 'declined') DEFAULT 'invited',
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES scheduled_meetings(meeting_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  UNIQUE KEY unique_meeting_participant (meeting_id, user_id),
  INDEX idx_meeting_id (meeting_id)
);
```

---

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "error": "group_id, creator_id, title, and scheduled_time are required"
}
```

### 404 Not Found

```json
{
  "error": "Failed to fetch meeting"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## 🔐 Line Notifications

### Meeting Created/Updated Notification

- **Type**: Flex Message
- **Color**: Indigo (#6366F1)
- **Content**:
  - Meeting title
  - Date/time
  - Location
  - Number of participants
  - 2 buttons: "เข้า Workspace" + "ดูรายละเอียด"

### Meeting Reminder Notification

- **Type**: Flex Message
- **Color**: Red (#EF4444)
- **Trigger**: 15 minutes before meeting
- **Content**:
  - "⏰ เตือนการประชุม"
  - Time until start
  - Button: "เข้า Workspace เดี๋ยวนี้"

### Meeting Cancelled Notification

- **Type**: Flex Message
- **Color**: Gray (#6B7280)
- **Content**:
  - "❌ ยกเลิกการประชุม"
  - Original meeting time

### Meeting Rescheduled Notification

- **Type**: Flex Message
- **Color**: Amber (#F59E0B)
- **Content**:
  - "🔄 เลื่อนเวลาการประชุม"
  - New time
  - Location

---

## 📝 Example cURL Commands

### Create Meeting

```bash
curl -X POST https://beefriendz-backend.onrender.com/api/scheduled-meetings \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": 11,
    "creator_id": 1,
    "title": "ประชุมประเมินโปรเจกต์",
    "scheduled_time": "2026-02-25T16:00:00",
    "location": "ห้องประชุมชั้น 2"
  }'
```

### Get Upcoming Meetings

```bash
curl https://beefriendz-backend.onrender.com/api/scheduled-meetings/upcoming?minutes=15&groupId=11
```

### Cancel Meeting

```bash
curl -X PUT https://beefriendz-backend.onrender.com/api/scheduled-meetings/1/cancel \
  -H "Content-Type: application/json" \
  -d '{"cancelled_reason": "ขออภัย"}'
```

### Reschedule Meeting

```bash
curl -X PUT https://beefriendz-backend.onrender.com/api/scheduled-meetings/1/reschedule \
  -H "Content-Type: application/json" \
  -d '{"scheduled_time": "2026-02-26T15:00:00"}'
```

### Confirm Participation

```bash
curl -X PUT https://beefriendz-backend.onrender.com/api/scheduled-meetings/1/participants/2 \
  -H "Content-Type: application/json" \
  -d '{"status": "accepted"}'
```

---

## ✅ Feature Checklist

- [x] Create meeting endpoint (POST)
- [x] Get upcoming meetings for N8N (GET /upcoming)
- [x] Get group meetings (GET /group/:id)
- [x] Get meeting details (GET /:id)
- [x] Cancel meeting (PUT /:id/cancel)
- [x] Reschedule meeting (PUT /:id/reschedule)
- [x] Participant status update (PUT /:id/participants/:userId)
- [x] LINE notifications (create, reminder, cancel, reschedule)
- [x] Auto-add participants when creating meeting
- [x] Prevent duplicate meetings (same day keep only latest)
- [ ] Frontend UI for meeting management (future)
- [ ] Meeting RSVP via LINE Rich Menu (future)
