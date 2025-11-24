const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// POST /api/groups/from-line - create or update group from LINE (for n8n)
router.post('/from-line', async (req, res) => {
  const { line_group_id, created_by: user_id, group_name } = req.body;
  const result = await groupController.createOrUpdateFromLine(line_group_id, user_id, group_name);
  if (result.success) {
    const statusCode = result.created ? 201 : 200;
    res.status(statusCode).json(result);
  } else {
    res.status(400).json({ error: result.error });
  }
});

// GET /api/groups - list groups
router.get('/', async (req, res) => {
  const result = await groupController.getGroups();
  if (result.success) res.json(result.data);
  else res.status(500).json({ error: result.error });
});

// GET /api/groups/line/:lineGroupId - get group by LINE Group ID
router.get('/line/:lineGroupId', async (req, res) => {
  const { lineGroupId } = req.params;
  const result = await groupController.getGroupByLineId(lineGroupId);
  if (result.success) res.json(result.data); // data จะเป็น null ถ้ายังไม่มีกลุ่ม
  else res.status(500).json({ error: result.error });
});

// GET /api/groups/:id - get group detail
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await groupController.getGroupById(id);
  if (result.success) res.json(result.data);
  else res.status(404).json({ error: result.error });
});

// POST /api/groups - create group
router.post('/', async (req, res) => {
  const result = await groupController.createGroup(req.body);
  if (result.success) res.status(201).json(result.data);
  else res.status(400).json({ error: result.error });
});

// PUT /api/groups/:id - update group
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await groupController.updateGroup(id, req.body);
  if (result.success) res.json(result.data);
  else res.status(400).json({ error: result.error });
});

// DELETE /api/groups/:id - delete group
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await groupController.deleteGroup(id);
  if (result.success) res.json({ message: result.message });
  else res.status(400).json({ error: result.error });
});

module.exports = router;
