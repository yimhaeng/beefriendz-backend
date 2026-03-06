const express = require('express');
const router = express.Router();
const {
  sendSticker,
  getPendingStickers,
  markStickersAsRead,
} = require('../controllers/stickerController');

// ส่งสติ๊กเกอร์
router.post('/send', sendSticker);

// ดึงสติ๊กเกอร์ที่ยังไม่ได้อ่าน
router.get('/pending/:userId', getPendingStickers);

// ทำเครื่องหมายว่าอ่านแล้ว
router.post('/mark-read', markStickersAsRead);

module.exports = router;
