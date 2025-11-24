const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users  -> คืนค่า array ของผู้ใช้
router.get('/', async (req, res) => {
  const result = await userController.getUsers();
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// GET /api/users/line/:line_id  -> คืนค่าผู้ใช้ด้วย line_id (สะดวกสำหรับ LIFF)
router.get('/line/:line_id', async (req, res) => {
  const { line_id } = req.params;
  const result = await userController.getUserByLineId(line_id);
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
});

// GET /api/users/health  -> ตรวจสอบสถานะการเชื่อมต่อกับฐานข้อมูล
router.get('/health', async (req, res) => {
  const result = await userController.getHealth();
  if (result.success) {
    res.json({ status: 'ok', userCount: result.userCount });
  } else {
    res.status(500).json({ status: 'error', error: result.error });
  }
});

// POST /api/users -> create or upsert user
router.post('/', async (req, res) => {
  const payload = req.body;
  const result = await userController.createOrUpdateUser(payload);
  if (result.success) {
    res.status(201).json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// GET /api/users/:id -> get user by user_id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await userController.getUserById(id);
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
});

// PUT /api/users/:id -> update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await userController.updateUser(id, req.body);
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// DELETE /api/users/:id -> delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await userController.deleteUser(id);
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.error });
  }
});

module.exports = router;
