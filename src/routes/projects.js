const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const groupController = require('../controllers/groupController');
const lineController = require('../controllers/lineController');

// ========== PROJECT ROUTES ==========

// GET /api/projects/group/:groupId - Get all projects by group
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const result = await projectController.getProjectsByGroup(groupId);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.getProjectById(id);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  const result = await projectController.createProject(req.body);
  
  if (result.success) {
    // ส่ง Flex Message ไปยังกลุ่ม LINE
    try {
      const groupResult = await groupController.getGroupById(req.body.group_id);
      if (groupResult.success && groupResult.data.line_group_id) {
        await lineController.sendProjectCreatedMessage(
          groupResult.data.line_group_id,
          result.data
        );
      }
    } catch (err) {
      console.error('[POST /api/projects] Error sending LINE message:', err);
      // ไม่ error ออกมา เพราะโปรเจกต์สร้างสำเร็จแล้ว
    }
    
    res.status(201).json(result.data);
  } else {
    // ถ้ากลุ่มมีโปรเจกต์แล้ว ให้ส่ง existingProjectId กลับไป
    if (result.existingProjectId) {
      res.status(409).json({ 
        error: result.error,
        existingProjectId: result.existingProjectId
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.updateProject(id, req.body);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.deleteProject(id);
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ========== PROJECT LOGS ==========

// GET /api/projects/:id/logs - Get activity logs for project
router.get('/:id/logs', async (req, res) => {
  const { id } = req.params;
  const result = await projectController.getLogsByProject(id);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

module.exports = router;
