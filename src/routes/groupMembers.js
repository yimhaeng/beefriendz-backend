const express = require('express');
const router = express.Router();
const gmController = require('../controllers/groupMemberController');

// GET /api/group-members/check/:groupId/:userId - check if user is member
// *** ต้องอยู่ก่อน /group/:groupId เพื่อไม่ให้ทับกัน ***
router.get('/check/:groupId/:userId', async (req, res) => {
  const { groupId, userId } = req.params;
  const result = await gmController.checkMembership(groupId, userId);
  if (result.success) res.json({ isMember: result.isMember, data: result.data });
  else res.status(500).json({ error: result.error });
});

// GET /api/group-members/user/:userId - get all group memberships for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await gmController.getMembershipsByUserId(userId);
  if (result.success) res.json(result.data);
  else res.status(500).json({ error: result.error });
});

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
  if (result.success) {
    // ถ้าเป็นสมาชิกอยู่แล้ว ส่ง 200 แทน 201
    const statusCode = result.alreadyMember ? 200 : 201;
    res.status(statusCode).json({ ...result.data, alreadyMember: result.alreadyMember });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// PUT /api/group-members/:id - update member role
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const result = await gmController.updateMember(id, role);
  if (result.success) res.json(result.data);
  else res.status(400).json({ error: result.error });
});

// PUT /api/group-members/:groupId/:userId - update member role by groupId and userId
router.put('/:groupId/:userId', async (req, res) => {
  const { groupId, userId } = req.params;
  const { role } = req.body;
  const result = await gmController.updateMemberRole(groupId, userId, role);
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
