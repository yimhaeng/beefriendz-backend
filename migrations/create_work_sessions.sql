-- ========================================
-- สร้างตาราง work_sessions สำหรับ Working Space
-- ========================================

CREATE TABLE IF NOT EXISTS "public"."work_sessions" (
  "session_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" bigint NOT NULL,
  "task_id" integer NOT NULL,
  "started_at" timestamp with time zone DEFAULT now(),
  "ended_at" timestamp with time zone,
  "duration_seconds" integer,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("session_id"),
  CONSTRAINT "work_sessions_user_id_fkey" FOREIGN KEY ("user_id") 
    REFERENCES "public"."users" ("user_id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "work_sessions_task_id_fkey" FOREIGN KEY ("task_id") 
    REFERENCES "public"."project_tasks" ("task_id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- สร้าง Indexes สำหรับ Performance
CREATE INDEX IF NOT EXISTS "work_sessions_user_id_idx" ON "public"."work_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "work_sessions_task_id_idx" ON "public"."work_sessions" ("task_id");
CREATE INDEX IF NOT EXISTS "work_sessions_status_idx" ON "public"."work_sessions" ("status");
CREATE INDEX IF NOT EXISTS "work_sessions_started_at_idx" ON "public"."work_sessions" ("started_at");

-- ========================================
-- สร้างตาราง workspace_presence สำหรับ Real-time Presence
-- ========================================

CREATE TABLE IF NOT EXISTS "public"."workspace_presence" (
  "presence_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" bigint NOT NULL,
  "session_id" uuid NOT NULL,
  "last_active" timestamp with time zone DEFAULT now(),
  "is_online" boolean DEFAULT true,
  PRIMARY KEY ("presence_id"),
  CONSTRAINT "workspace_presence_user_id_fkey" FOREIGN KEY ("user_id") 
    REFERENCES "public"."users" ("user_id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "workspace_presence_session_id_fkey" FOREIGN KEY ("session_id") 
    REFERENCES "public"."work_sessions" ("session_id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- สร้าง unique constraint เพื่อไม่ให้ user มี presence ซ้ำในเวลาเดียวกัน
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_presence_user_session_idx" 
  ON "public"."workspace_presence" ("user_id", "session_id");

CREATE INDEX IF NOT EXISTS "workspace_presence_is_online_idx" ON "public"."workspace_presence" ("is_online");
CREATE INDEX IF NOT EXISTS "workspace_presence_last_active_idx" ON "public"."workspace_presence" ("last_active");

-- ========================================
-- Function สำหรับ cleanup presence ที่ offline เกิน 5 นาที
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_offline_presence()
RETURNS void AS $$
BEGIN
  UPDATE "public"."workspace_presence"
  SET "is_online" = false
  WHERE "last_active" < (NOW() - INTERVAL '5 minutes')
    AND "is_online" = true;
END;
$$ LANGUAGE plpgsql;

-- Comment สำหรับตาราง
COMMENT ON TABLE "public"."work_sessions" IS 'บันทึก work sessions ของ users แต่ละคน';
COMMENT ON TABLE "public"."workspace_presence" IS 'บันทึกสถานะ real-time presence ของ users ใน workspace';
