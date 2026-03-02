-- ========================================
-- Migration: Clean up unused columns
-- ========================================
-- ลบ duration_seconds ที่ไม่ใช้แล้ว (ใช้ actual_duration_seconds แทน)

ALTER TABLE "public"."work_sessions" 
DROP COLUMN IF EXISTS "duration_seconds";
