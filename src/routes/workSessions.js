const express = require('express');
const router = express.Router();
const {
  startWorkSession,
  endWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  getActiveSessions,
  getActivePresence,
  updatePresence,
  getUserSessionHistory,
  getUserSessionStats,
  updateActivityStage,
  checkAndAutoEndSleepSessions
} = require('../controllers/workSessionController');

// เริ่ม work session
router.post('/start', startWorkSession);

// จบ work session
router.post('/end', endWorkSession);

// หยุดพัก (Pause) work session
router.post('/pause', pauseWorkSession);

// กลับมาทำต่อ (Resume) work session
router.post('/resume', resumeWorkSession);

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

// อัปเดต activity stage (active/sleep/offline)
router.post('/update-stage', updateActivityStage);

// ตรวจสอบและจบ sleep sessions ที่หมดเวลา
router.post('/check-auto-end-sleep', checkAndAutoEndSleepSessions);

module.exports = router;
