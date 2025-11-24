-- ======================================
-- BeeFriendz - Projects & Tasks Schema
-- ======================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Project Tasks Table (งานย่อย)
CREATE TABLE IF NOT EXISTS project_tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(user_id), -- คนที่ได้รับมอบหมาย
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in-progress', 'done'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    deadline DATE,
    phase VARCHAR(100), -- หมวดหมู่/ขั้นตอน เช่น "หาข้อมูล", "ทำสไลด์"
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Task Attachments Table (ไฟล์/รูปที่แนบในงาน)
CREATE TABLE IF NOT EXISTS task_attachments (
    attachment_id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES project_tasks(task_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL, -- URL จาก Cloudinary/S3/Supabase Storage
    file_type VARCHAR(50), -- 'image', 'document', 'pdf', etc.
    file_size INTEGER, -- bytes
    uploaded_by INTEGER REFERENCES users(user_id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 4. Activity Logs Table (บันทึกทุกการเปลี่ยนแปลง)
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(task_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned', 'file_uploaded', 'completed'
    description TEXT, -- รายละเอียดการเปลี่ยนแปลง เช่น "เปลี่ยนสถานะจาก pending เป็น in-progress"
    old_value TEXT, -- ค่าเก่า (JSON format)
    new_value TEXT, -- ค่าใหม่ (JSON format)
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Task Comments Table (แสดงความคิดเห็น/หมายเหตุ)
CREATE TABLE IF NOT EXISTS task_comments (
    comment_id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES project_tasks(task_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ======================================
-- Indexes สำหรับ Performance
-- ======================================

CREATE INDEX idx_projects_group_id ON projects(group_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX idx_tasks_status ON project_tasks(status);
CREATE INDEX idx_tasks_deadline ON project_tasks(deadline);
CREATE INDEX idx_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_logs_task_id ON activity_logs(task_id);
CREATE INDEX idx_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_comments_task_id ON task_comments(task_id);

-- ======================================
-- Triggers สำหรับ updated_at
-- ======================================

-- Projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_timestamp
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_projects_updated_at();

-- Tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_timestamp
BEFORE UPDATE ON project_tasks
FOR EACH ROW
EXECUTE FUNCTION update_tasks_updated_at();

-- Comments
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comments_timestamp
BEFORE UPDATE ON task_comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_updated_at();

-- ======================================
-- Sample Data (Optional - for testing)
-- ======================================

-- INSERT INTO projects (group_id, project_name, description, start_date, end_date, created_by)
-- VALUES 
-- (1, 'วิจัยตลาดชานม', 'วิเคราะห์ตลาดชานมในประเทศไทย', '2025-10-01', '2025-10-30', 1);

-- INSERT INTO project_tasks (project_id, task_name, description, assigned_to, status, deadline, phase, created_by)
-- VALUES 
-- (1, 'ค้นหาข้อมูล', 'หาข้อมูลและสถิติการตลาดชานมในไทย', 1, 'done', '2025-10-15', 'หาข้อมูล', 1),
-- (1, 'ทำสไลด์', 'วิเคราะห์ข้อมูลและทำสไลด์', 2, 'in-progress', '2025-10-20', 'ทำสไลด์', 1),
-- (1, 'นำเสนอ', 'นำเสนอสไลด์', 3, 'pending', '2025-10-30', 'นำเสนอ', 1);
