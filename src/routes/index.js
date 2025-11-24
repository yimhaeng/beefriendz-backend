const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// ดึงข้อมูลทั้งหมดจากตาราง
router.get('/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const result = await dataController.getAllData(tableName);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ดึงข้อมูลตาม ID
router.get('/:tableName/:id', async (req, res) => {
  const { tableName, id } = req.params;
  const result = await dataController.getDataById(tableName, id);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
});

// สร้างข้อมูลใหม่
router.post('/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const result = await dataController.createData(tableName, req.body);
  
  if (result.success) {
    res.status(201).json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// แก้ไขข้อมูล
router.put('/:tableName/:id', async (req, res) => {
  const { tableName, id } = req.params;
  const result = await dataController.updateData(tableName, id, req.body);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// ลบข้อมูล
router.delete('/:tableName/:id', async (req, res) => {
  const { tableName, id } = req.params;
  const result = await dataController.deleteData(tableName, id);
  
  if (result.success) {
    res.json(result.message);
  } else {
    res.status(400).json({ error: result.error });
  }
});

module.exports = router;
