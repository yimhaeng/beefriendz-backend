-- ========================================
-- Migration: เพิ่ม Timeboxing Support
-- ========================================
-- เพิ่ม columns ที่จำเป็นสำหรับ Timeboxing feature

-- เพิ่ม planned_duration (นาที) ใน work_sessions
ALTER TABLE "public"."work_sessions" 
ADD COLUMN IF NOT EXISTS "planned_duration" integer DEFAULT NULL;

-- เพิ่ม paused_at สำหรับบันทึกเวลาที่หยุดพัก
ALTER TABLE "public"."work_sessions" 
ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone DEFAULT NULL;

-- เพิ่ม pause_duration_seconds สำหรับบันทึกเวลาที่พักสะสม
ALTER TABLE "public"."work_sessions" 
ADD COLUMN IF NOT EXISTS "pause_duration_seconds" integer DEFAULT 0;

-- เพิ่ม actual_duration_seconds สำหรับบันทึกเวลาทำงานจริง (ไม่รวมเวลาพัก)
ALTER TABLE "public"."work_sessions" 
ADD COLUMN IF NOT EXISTS "actual_duration_seconds" integer DEFAULT 0;

-- เพิ่ม Index
CREATE INDEX IF NOT EXISTS "work_sessions_planned_duration_idx" 
  ON "public"."work_sessions" ("planned_duration");

-- Comments
COMMENT ON COLUMN "public"."work_sessions"."planned_duration" IS 'เวลาที่วางแผนไว้ในการทำงาน (นาที)';
COMMENT ON COLUMN "public"."work_sessions"."paused_at" IS 'เวลาที่หยุดพัก (NULL = ไม่ได้พัก)';
COMMENT ON COLUMN "public"."work_sessions"."pause_duration_seconds" IS 'เวลาที่พักสะสมทั้งหมด (วินาที)';
COMMENT ON COLUMN "public"."work_sessions"."actual_duration_seconds" IS 'เวลาทำงานจริง ไม่รวมเวลาพัก (วินาที)';
