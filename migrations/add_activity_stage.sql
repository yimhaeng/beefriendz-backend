-- ========================================
-- เพิ่ม activity stage tracking
-- ========================================

-- เพิ่ม column activity_stage ใน workspace_presence (active, sleep, offline)
ALTER TABLE "public"."workspace_presence" 
ADD COLUMN IF NOT EXISTS "activity_stage" text DEFAULT 'active'::text;

-- เพิ่ม column last_activity_at ใน work_sessions
ALTER TABLE "public"."work_sessions" 
ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone DEFAULT now();

-- สร้าง index สำหรับ activity_stage
CREATE INDEX IF NOT EXISTS "workspace_presence_activity_stage_idx" 
  ON "public"."workspace_presence" ("activity_stage");

-- สร้าง index สำหรับ last_activity_at
CREATE INDEX IF NOT EXISTS "work_sessions_last_activity_at_idx" 
  ON "public"."work_sessions" ("last_activity_at");

-- Function สำหรับ auto end session ที่ sleep mode > 30 นาที
CREATE OR REPLACE FUNCTION auto_end_sleep_sessions()
RETURNS void AS $$
BEGIN
  -- อัปเดต work_sessions ที่ sleep mode เกิน 30 นาทีเป็น completed
  UPDATE "public"."work_sessions"
  SET 
    "status" = 'completed',
    "ended_at" = NOW(),
    "duration_seconds" = EXTRACT(EPOCH FROM (NOW() - "started_at"))::integer
  WHERE "status" = 'active'
    AND "last_activity_at" < (NOW() - INTERVAL '30 minutes')
    AND "ended_at" IS NULL;

  -- ลบ presence records ที่เกี่ยวข้อง
  DELETE FROM "public"."workspace_presence"
  WHERE "session_id" IN (
    SELECT "session_id" FROM "public"."work_sessions"
    WHERE "status" = 'completed'
      AND "ended_at" IS NOT NULL
      AND "ended_at" >= (NOW() - INTERVAL '1 minute')
  );
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON COLUMN "public"."workspace_presence"."activity_stage" IS 'สถานะการทำงาน: active (อยู่ในหน้า), sleep (ไม่อยู่แต่ยังไม่จบ), offline (จบแล้ว)';
COMMENT ON COLUMN "public"."work_sessions"."last_activity_at" IS 'เวลาของการทำงานครั้งสุดท้าย';
