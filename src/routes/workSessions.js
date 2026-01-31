const express = require('express');
const router = express.Router();
const {
  startWorkSession,
  endWorkSession,
  getActiveSessions,
  getActivePresence,
  updatePresence,
  getUserSessionHistory,
  getUserSessionStats
} = require('../controllers/workSessionController');

// เริ่ม work session
router.post('/start', startWorkSession);

// จบ work session
router.post('/end', endWorkSession);

// ดึงข้อมูล active sessions ทั้งหมด
router.get('/active', getActiveSessions);

// ดึงข้อมูล active presence
router.get('/presence', getActivePresence);

// อัปเดต presence (heartbeat)
router.post('/heartbeat', updatePresence);

// ดึงประวัติ work sessions ของ user
router.get('/history/:userId', getUserSessionHistory);

// ดึงสถิติ work sessions
router.get('/stats/:userId', getUserSessionStats);

module.exports = router;
