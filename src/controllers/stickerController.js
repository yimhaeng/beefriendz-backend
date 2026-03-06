const supabase = require('../config/supabase');

/**
 * ส่งสติ๊กเกอร์ให้เพื่อนที่กำลังทำงาน
 * POST /api/stickers/send
 * Body: { sender_user_id, recipient_user_ids, sticker_type, group_id }
 */
async function sendSticker(req, res) {
  try {
    const { sender_user_id, recipient_user_ids, sticker_type, group_id } = req.body;

    // Validation
    if (!sender_user_id || !recipient_user_ids || !Array.isArray(recipient_user_ids) || recipient_user_ids.length === 0) {
      return res.status(400).json({ error: 'sender_user_id and recipient_user_ids (array) are required' });
    }

    if (!sticker_type || !['cheer', 'fire', 'coffee', 'congrats'].includes(sticker_type)) {
      return res.status(400).json({ error: 'Invalid sticker_type. Must be: cheer, fire, coffee, or congrats' });
    }

    // Create sticker interactions for each recipient
    const stickerInteractions = recipient_user_ids.map(recipient_id => ({
      sender_user_id,
      recipient_user_id: recipient_id,
      sticker_type,
      group_id: group_id || null,
      is_read: false,
    }));

    const { data, error } = await supabase
      .from('sticker_interactions')
      .insert(stickerInteractions)
      .select();

    if (error) {
      console.error('[sendSticker] Error inserting stickers:', error);
      return res.status(500).json({ error: 'Failed to send stickers' });
    }

    console.log(`[sendSticker] Successfully sent ${data.length} stickers from user ${sender_user_id}`);
    res.json({ success: true, sent_count: data.length, stickers: data });
  } catch (err) {
    console.error('[sendSticker] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ดึงสติ๊กเกอร์ที่ยังไม่ได้อ่าน
 * GET /api/stickers/pending/:userId
 */
async function getPendingStickers(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: stickers, error } = await supabase
      .from('sticker_interactions')
      .select(`
        *,
        sender:sender_user_id (
          user_id,
          display_name,
          picture_url
        )
      `)
      .eq('recipient_user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getPendingStickers] Error fetching stickers:', error);
      return res.status(500).json({ error: 'Failed to fetch pending stickers' });
    }

    res.json({ success: true, stickers: stickers || [] });
  } catch (err) {
    console.error('[getPendingStickers] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ทำเครื่องหมายสติ๊กเกอร์ว่าอ่านแล้ว
 * POST /api/stickers/mark-read
 * Body: { sticker_ids: [1, 2, 3] }
 */
async function markStickersAsRead(req, res) {
  try {
    const { sticker_ids } = req.body;

    if (!sticker_ids || !Array.isArray(sticker_ids) || sticker_ids.length === 0) {
      return res.status(400).json({ error: 'sticker_ids array is required' });
    }

    const { data, error } = await supabase
      .from('sticker_interactions')
      .update({ is_read: true })
      .in('sticker_id', sticker_ids)
      .select();

    if (error) {
      console.error('[markStickersAsRead] Error updating stickers:', error);
      return res.status(500).json({ error: 'Failed to mark stickers as read' });
    }

    console.log(`[markStickersAsRead] Marked ${data.length} stickers as read`);
    res.json({ success: true, updated_count: data.length });
  } catch (err) {
    console.error('[markStickersAsRead] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  sendSticker,
  getPendingStickers,
  markStickersAsRead,
};
