const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// ดึงโปรเจกต์ของ user ตาม line_id (จาก LIFF)
router.get('/by-line/:lineId', async (req, res) => {
  const { lineId } = req.params;
  const result = await projectController.getProjectsByLineId(lineId);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ดึงโปรเจกต์ของ user ตาม user_id
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await projectController.getProjectsByUserId(userId);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ดึงรายละเอียดโปรเจกต์พร้อมกับงานย่อย
router.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const result = await projectController.getProjectDetailById(projectId);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
});

// สร้างโปรเจกต์ใหม่
router.post('/', async (req, res) => {
  const { userId, name, description, status } = req.body;
  
  if (!userId || !name) {
    return res.status(400).json({ error: 'userId and name are required' });
  }
  
  const result = await projectController.createProject(userId, {
    name,
    description,
    status
  });
  
  if (result.success) {
    res.status(201).json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// แก้ไขโปรเจกต์
router.put('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const result = await projectController.updateProject(projectId, req.body);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ลบโปรเจกต์
router.delete('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const result = await projectController.deleteProject(projectId);
  
  if (result.success) {
    res.json(result.message);
  } else {
    res.status(400).json({ error: result.error });
  }
});

module.exports = router;
