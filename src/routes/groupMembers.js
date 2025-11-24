const express = require('express');
const router = express.Router();
const gmController = require('../controllers/groupMemberController');

// GET /api/group-members/group/:groupId - list members of a group
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const result = await gmController.getMembersByGroupId(groupId);
  if (result.success) res.json(result.data);
  else res.status(500).json({ error: result.error });
});

// POST /api/group-members - add member (expect { group_id, user_id, role })
router.post('/', async (req, res) => {
  const { group_id, user_id, role } = req.body;
  const result = await gmController.addMember(group_id, user_id, role);
  if (result.success) res.status(201).json(result.data);
  else res.status(400).json({ error: result.error });
});

// PUT /api/group-members/:id - update member role
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const result = await gmController.updateMember(id, role);
  if (result.success) res.json(result.data);
  else res.status(400).json({ error: result.error });
});

// DELETE /api/group-members/:id - remove member
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await gmController.removeMember(id);
  if (result.success) res.json({ message: result.message });
  else res.status(400).json({ error: result.error });
});

module.exports = router;
