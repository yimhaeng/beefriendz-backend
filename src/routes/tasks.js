const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

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
  
  // Get old task data for logging
  const oldTask = await projectController.getTaskById(id);
  
  const result = await projectController.updateTask(id, req.body);
  
  if (result.success) {
    // Create activity log if status changed
    if (oldTask.success && req.body.status && oldTask.data.status !== req.body.status) {
      await projectController.createLog({
        project_id: result.data.project_id,
        task_id: id,
        user_id: req.body.updated_by || result.data.assigned_to,
        action_type: 'status_changed',
        description: `เปลี่ยนสถานะจาก "${oldTask.data.status}" เป็น "${req.body.status}"`,
        old_value: oldTask.data.status,
        new_value: req.body.status,
      });
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
