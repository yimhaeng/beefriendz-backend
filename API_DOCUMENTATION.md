# API Documentation - Projects Endpoints

## Overview

API endpoints สำหรับจัดการข้อมูลโปรเจกต์ที่เชื่อมต่อกับ LINE LIFF

## Base URL

```
http://localhost:3000/api/projects
```

---

## Endpoints

### 1. ดึงโปรเจกต์ของ user ตาม LINE ID (สำหรับ LIFF)

**Endpoint:** `GET /by-line/:lineId`

**Description:** ดึงรายการโปรเจกต์ทั้งหมดของ user ผ่าน LINE ID

**Parameters:**

- `lineId` (string, required) - LINE user ID จาก LIFF profile

**Example Request:**

```bash
GET /api/projects/by-line/U1234567890abcdef1234567890abcdef
```

**Example Response:**

```json
[
  {
    "id": "proj_001",
    "user_id": "user_123",
    "name": "Website Redesign",
    "description": "Redesign company website",
    "status": "active",
    "created_at": "2025-11-20T10:30:00Z"
  },
  {
    "id": "proj_002",
    "user_id": "user_123",
    "name": "Mobile App Development",
    "description": "Develop new mobile app",
    "status": "in-progress",
    "created_at": "2025-11-18T15:45:00Z"
  }
]
```

---

### 2. ดึงโปรเจกต์ของ user ตาม User ID

**Endpoint:** `GET /user/:userId`

**Description:** ดึงรายการโปรเจกต์ของ user ตาม user_id

**Parameters:**

- `userId` (string, required) - User ID จากฐานข้อมูล

**Example Request:**

```bash
GET /api/projects/user/user_123
```

**Example Response:**

```json
[
  {
    "id": "proj_001",
    "user_id": "user_123",
    "name": "Website Redesign",
    "description": "Redesign company website",
    "status": "active",
    "created_at": "2025-11-20T10:30:00Z"
  }
]
```

---

### 3. ดึงรายละเอียดโปรเจกต์พร้อมงานย่อย

**Endpoint:** `GET /:projectId`

**Description:** ดึงข้อมูลโปรเจกต์เดี่ยวพร้อมกับรายการ tasks ทั้งหมด

**Parameters:**

- `projectId` (string, required) - Project ID

**Example Request:**

```bash
GET /api/projects/proj_001
```

**Example Response:**

```json
{
  "id": "proj_001",
  "user_id": "user_123",
  "name": "Website Redesign",
  "description": "Redesign company website",
  "status": "active",
  "created_at": "2025-11-20T10:30:00Z",
  "tasks": [
    {
      "id": "task_001",
      "project_id": "proj_001",
      "title": "Design mockups",
      "description": "Create UI mockups",
      "status": "completed",
      "created_at": "2025-11-20T11:00:00Z"
    },
    {
      "id": "task_002",
      "project_id": "proj_001",
      "title": "Frontend development",
      "description": "Build frontend components",
      "status": "in-progress",
      "created_at": "2025-11-21T09:00:00Z"
    }
  ]
}
```

---

### 4. สร้างโปรเจกต์ใหม่

**Endpoint:** `POST /`

**Description:** สร้างโปรเจกต์ใหม่

**Request Body:**

```json
{
  "userId": "user_123",
  "name": "New Project Name",
  "description": "Optional description",
  "status": "active"
}
```

**Required Fields:**

- `userId` - User ID
- `name` - ชื่อโปรเจกต์

**Optional Fields:**

- `description` - คำอธิบาย
- `status` - สถานะ (default: "active")

**Example Request:**

```bash
POST /api/projects
Content-Type: application/json

{
  "userId": "user_123",
  "name": "New Marketing Campaign",
  "description": "Q4 marketing initiative",
  "status": "planning"
}
```

**Example Response:**

```json
[
  {
    "id": "proj_003",
    "user_id": "user_123",
    "name": "New Marketing Campaign",
    "description": "Q4 marketing initiative",
    "status": "planning",
    "created_at": "2025-11-22T10:00:00Z"
  }
]
```

---

### 5. แก้ไขโปรเจกต์

**Endpoint:** `PUT /:projectId`

**Description:** อัปเดตข้อมูลโปรเจกต์

**Parameters:**

- `projectId` (string, required) - Project ID

**Request Body:**

```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "completed"
}
```

**Example Request:**

```bash
PUT /api/projects/proj_001
Content-Type: application/json

{
  "name": "Website Redesign - Phase 2",
  "status": "in-progress"
}
```

**Example Response:**

```json
[
  {
    "id": "proj_001",
    "user_id": "user_123",
    "name": "Website Redesign - Phase 2",
    "description": "Redesign company website",
    "status": "in-progress",
    "created_at": "2025-11-20T10:30:00Z"
  }
]
```

---

### 6. ลบโปรเจกต์

**Endpoint:** `DELETE /:projectId`

**Description:** ลบโปรเจกต์

**Parameters:**

- `projectId` (string, required) - Project ID

**Example Request:**

```bash
DELETE /api/projects/proj_001
```

**Example Response:**

```json
{
  "message": "Project deleted successfully"
}
```

---

## Error Responses

### Bad Request (400)

```json
{
  "error": "userId and name are required"
}
```

### Not Found (404)

```json
{
  "error": "User not found"
}
```

---

## การใช้งานใน LIFF

### ตัวอย่างการดึงข้อมูลโปรเจกต์ใน React Component:

```typescript
import { useProjects } from "@/lib/useProjects";

export function ProjectsList() {
  const { projects, loading, error } = useProjects();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <span>{project.status}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Environment Variables

ต้องตั้งค่าใน `.env.local` ของ LIFF project:

```env
NEXT_PUBLIC_LIFF_ID=your_liff_id
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Notes

- ทุก endpoints ต้องการ LINE user ที่ valid
- API จะค้นหา user จาก LINE ID และ link กับ user_id ในฐานข้อมูล
- ตัวแปร timestamp (`created_at`) ถูกสร้างโดยอัตโนมัติ
