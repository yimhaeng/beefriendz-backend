const express = require('express');
const router = express.Router();
const {
  createOrUpdateMeeting,
  getUpcomingMeetings,
  cancelMeeting,
  rescheduleMeeting,
  getMeetingsByGroup,
  getMeetingDetails,
  updateParticipantStatus
} = require('../controllers/meetingController');

// สร้าง/อัพเดท meeting
router.post('/', createOrUpdateMeeting);

// ดึง meetings ที่จะเริ่มขึ้นในเวลา X นาทีข้างหน้า (สำหรับ N8N reminder)
router.get('/upcoming', getUpcomingMeetings);

// ดึง meetings ทั้งหมดของกลุ่ม
router.get('/group/:groupId', getMeetingsByGroup);

// ดึง meeting details
router.get('/:meetingId', getMeetingDetails);

// ยกเลิกการประชุม
router.put('/:meetingId/cancel', cancelMeeting);

// เลื่อนเวลาการประชุม
router.put('/:meetingId/reschedule', rescheduleMeeting);

// ยืนยันการเข้าร่วมการประชุม
router.put('/:meetingId/participants/:userId', updateParticipantStatus);

module.exports = router;
