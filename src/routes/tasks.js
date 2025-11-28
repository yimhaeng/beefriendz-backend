const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const lineController = require('../controllers/lineController');

// ========== TASK ROUTES ==========

// GET /api/tasks/project/:projectId - Get all tasks by project
router.get('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const result = await projectController.getTasksByProject(projectId);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// GET /api/tasks/user/:userId - Get tasks assigned to user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await projectController.getTasksByUser(userId);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// GET /api/tasks/near-deadline - Get tasks near deadline (for cron)
router.get('/near-deadline', async (req, res) => {
  const daysAhead = parseInt(req.query.days) || 2;
  const result = await projectController.getTasksNearDeadline(daysAhead);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// GET /api/tasks/:id - Get single task with details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.getTaskById(id);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  const result = await projectController.createTask(req.body);
  
  if (result.success) {
    // Create activity log
    await projectController.createLog({
      project_id: req.body.project_id,
      task_id: result.data.task_id,
      user_id: req.body.created_by,
      action_type: 'created',
      description: `สร้างงาน "${req.body.task_name}"`,
    });
    
    res.status(201).json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Get old task data before update (for comparison)
  const oldTaskResult = await projectController.getTaskById(id);
  const oldStatus = oldTaskResult.success ? oldTaskResult.data.status : null;
  
  const result = await projectController.updateTask(id, req.body);
  
  if (result.success) {
    // ถ้ามีการเปลี่ยนสถานะ ส่งแจ้งเตือนไปกลุ่ม LINE
    if (oldStatus && req.body.status && oldStatus !== req.body.status) {
      console.log('[PUT /api/tasks/:id] Status changed from', oldStatus, 'to', req.body.status);
      
      // ส่ง LINE notification แบบ async (ไม่รอ)
      (async () => {
        try {
          console.log('[LINE NOTIFICATION] Starting...');
          
          // ดึงข้อมูลงานพร้อม project และ group
          const taskWithDetails = await projectController.getTaskById(id);
          console.log('[LINE NOTIFICATION] Task details fetched:', !!taskWithDetails.success);
          
          if (taskWithDetails.success && taskWithDetails.data.project) {
            const task = taskWithDetails.data;
            console.log('[LINE NOTIFICATION] Task name:', task.task_name);
            console.log('[LINE NOTIFICATION] Project:', task.project);
            
            // ดึงข้อมูล user ที่อัปเดต
            const supabase = require('../config/supabase');
            let updatedByUser = null;
            if (req.body.updated_by) {
              const { data: userData } = await supabase
                .from('users')
                .select('user_id, display_name')
                .eq('user_id', req.body.updated_by)
                .single();
              updatedByUser = userData;
              console.log('[LINE NOTIFICATION] Updated by:', updatedByUser?.display_name);
            }
            
            // ดึง line_group_id จาก project
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('group_id, groups(line_group_id)')
              .eq('project_id', task.project.project_id)
              .single();
            
            if (projectError) {
              console.error('[LINE NOTIFICATION] Error fetching project data:', projectError);
              return;
            }
            
            console.log('[LINE NOTIFICATION] Project data:', JSON.stringify(projectData));
            console.log('[LINE NOTIFICATION] LINE Group ID:', projectData?.groups?.line_group_id);
            
            if (projectData?.groups?.line_group_id) {
              console.log('[LINE NOTIFICATION] Sending message...');
              const lineResult = await lineController.sendTaskStatusUpdateMessage(
                projectData.groups.line_group_id,
                {
                  task_name: task.task_name,
                  status: req.body.status,
                  old_status: oldStatus,
                  assigned_user: task.assigned_user,
                  updated_by_user: updatedByUser,
                  project: task.project
                }
              );
              console.log('[LINE NOTIFICATION] Result:', lineResult);
            } else {
              console.log('[LINE NOTIFICATION] No LINE group ID found in project data');
            }
          } else {
            console.log('[LINE NOTIFICATION] No project data in task');
          }
        } catch (err) {
          console.error('[LINE NOTIFICATION] Error:', err);
          console.error('[LINE NOTIFICATION] Error stack:', err.stack);
        }
      })();
    }
    
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.deleteTask(id);
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ========== TASK ATTACHMENTS ==========

// GET /api/tasks/:id/attachments - Get task attachments
router.get('/:id/attachments', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.getAttachmentsByTask(id);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// POST /api/tasks/:id/attachments - Add attachment to task
router.post('/:id/attachments', async (req, res) => {
  const { id } = req.params;
  const attachmentData = {
    task_id: id,
    ...req.body,
  };
  
  const result = await projectController.createAttachment(attachmentData);
  
  if (result.success) {
    // Create activity log
    await projectController.createLog({
      task_id: id,
      user_id: req.body.uploaded_by,
      action_type: 'file_uploaded',
      description: `อัพโหลดไฟล์ "${req.body.file_name}"`,
    });
    
    res.status(201).json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// DELETE /api/tasks/attachments/:attachmentId - Delete attachment
router.delete('/attachments/:attachmentId', async (req, res) => {
  const { attachmentId } = req.params;
  const result = await projectController.deleteAttachment(attachmentId);
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ========== TASK COMMENTS ==========

// GET /api/tasks/:id/comments - Get task comments
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.getCommentsByTask(id);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const commentData = {
    task_id: id,
    ...req.body,
  };
  
  const result = await projectController.createComment(commentData);
  
  if (result.success) {
    res.status(201).json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

module.exports = router;
