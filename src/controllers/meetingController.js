const supabase = require('../config/supabase');
const lineController = require('./lineController');

/**
 * สร้าง/อัพเดท scheduled meeting
 * ถ้ามีการจัดเวลาซ้ำวันเดียว จะอัพเดทเดิม (keep only latest)
 * POST /api/scheduled-meetings
 * Body: { group_id, creator_id, title, description?, scheduled_time, location? }
 */
async function createOrUpdateMeeting(req, res) {
  try {
    const { group_id, creator_id, title, description, scheduled_time, location } = req.body;

    // Validate required fields
    if (!group_id || !creator_id || !title || !scheduled_time) {
      return res.status(400).json({ error: 'group_id, creator_id, title, and scheduled_time are required' });
    }

    // Parse scheduled_time to ensure it's valid
    const meetingDate = new Date(scheduled_time);
    if (isNaN(meetingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_time format' });
    }

    // Check if meeting already exists on the same day for this group
    const startOfDay = new Date(meetingDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(meetingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingMeetings, error: checkError } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('group_id', group_id)
      .eq('status', 'pending')
      .gte('scheduled_time', startOfDay.toISOString())
      .lte('scheduled_time', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (checkError) {
      console.error('[Meeting] Error checking existing meetings:', checkError);
      return res.status(500).json({ error: 'Failed to check existing meetings' });
    }

    let meeting;
    
    if (existingMeetings && existingMeetings.length > 0) {
      // Update the latest meeting (keep only latest)
      const latestMeeting = existingMeetings[0];
      
      console.log(`[Meeting] Updating existing meeting ${latestMeeting.meeting_id}`);
      
      const { data: updatedMeeting, error: updateError } = await supabase
        .from('scheduled_meetings')
        .update({
          title,
          description: description || null,
          scheduled_time: meetingDate.toISOString(),
          location: location || null,
          updated_at: new Date().toISOString()
        })
        .eq('meeting_id', latestMeeting.meeting_id)
        .select()
        .single();

      if (updateError) {
        console.error('[Meeting] Error updating meeting:', updateError);
        return res.status(500).json({ error: 'Failed to update meeting' });
      }

      meeting = updatedMeeting;
    } else {
      // Create new meeting
      const { data: newMeeting, error: insertError } = await supabase
        .from('scheduled_meetings')
        .insert({
          group_id,
          creator_id,
          title,
          description: description || null,
          scheduled_time: meetingDate.toISOString(),
          location: location || null,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Meeting] Error creating meeting:', insertError);
        return res.status(500).json({ error: 'Failed to create meeting' });
      }

      meeting = newMeeting;

      // Add all group members as invited participants
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group_id);

      if (!membersError && groupMembers && groupMembers.length > 0) {
        const participants = groupMembers.map(m => ({
          meeting_id: newMeeting.meeting_id,
          user_id: m.user_id,
          status: 'invited'
        }));

        await supabase
          .from('meeting_participants')
          .insert(participants);
      }
    }

    // Fetch full meeting details with group info
    const { data: fullMeeting, error: fetchError } = await supabase
      .from('scheduled_meetings')
      .select(`
        *,
        creator:creator_id (user_id, display_name, picture_url),
        participants:meeting_participants (
          id,
          user_id,
          status,
          user:user_id (user_id, display_name, picture_url)
        ),
        group:group_id (group_id, group_name, line_group_id)
      `)
      .eq('meeting_id', meeting.meeting_id)
      .single();

    // Send LINE notification (async)
    if (!fetchError && fullMeeting?.group?.line_group_id) {
      lineController.sendMeetingNotification(fullMeeting.group.line_group_id, fullMeeting)
        .catch(err => console.error('[Meeting] Error sending LINE notification:', err));
    }

    return res.status(201).json({ success: true, meeting: fullMeeting });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ดึง meetings ที่จะเริ่มขึ้นในเวลาไม่กี่นาทีข้างหน้า (สำหรับ N8N reminder)
 * GET /api/scheduled-meetings/upcoming?minutes=15&groupId=1
 */
async function getUpcomingMeetings(req, res) {
  try {
    const minutes = parseInt(req.query.minutes) || 15;
    const groupId = req.query.groupId ? parseInt(req.query.groupId) : null;

    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60000);

    let query = supabase
      .from('scheduled_meetings')
      .select(`
        *,
        creator:creator_id (user_id, display_name, picture_url),
        participants:meeting_participants (
          id,
          user_id,
          status,
          user:user_id (user_id, display_name, picture_url)
        ),
        group:group_id (group_id, group_name, line_group_id)
      `)
      .eq('status', 'pending')
      .gte('scheduled_time', now.toISOString())
      .lte('scheduled_time', futureTime.toISOString());

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error('[Meeting] Error fetching upcoming meetings:', error);
      return res.status(500).json({ error: 'Failed to fetch upcoming meetings' });
    }

    return res.json({ success: true, meetings: meetings || [] });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ยกเลิกการประชุม
 * PUT /api/scheduled-meetings/:meetingId/cancel
 */
async function cancelMeeting(req, res) {
  try {
    const { meetingId } = req.params;
    const { cancelled_reason } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'meetingId is required' });
    }

    const { data: meeting, error: updateError } = await supabase
      .from('scheduled_meetings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('meeting_id', meetingId)
      .select()
      .single();

    if (updateError) {
      console.error('[Meeting] Error cancelling meeting:', updateError);
      return res.status(500).json({ error: 'Failed to cancel meeting' });
    }

    // Fetch full details for notification
    const { data: fullMeeting } = await supabase
      .from('scheduled_meetings')
      .select(`
        *,
        group:group_id (group_id, group_name, line_group_id)
      `)
      .eq('meeting_id', meetingId)
      .single();

    // Send cancellation notification (async)
    if (fullMeeting?.group?.line_group_id) {
      lineController.sendMeetingCancelledNotification(fullMeeting.group.line_group_id, fullMeeting)
        .catch(err => console.error('[Meeting] Error sending cancellation notification:', err));
    }

    return res.json({ success: true, message: 'Meeting cancelled', meeting });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * เลื่อนเวลาการประชุม
 * PUT /api/scheduled-meetings/:meetingId/reschedule
 * Body: { scheduled_time, reason? }
 */
async function rescheduleMeeting(req, res) {
  try {
    const { meetingId } = req.params;
    const { scheduled_time, reason } = req.body;

    if (!meetingId || !scheduled_time) {
      return res.status(400).json({ error: 'meetingId and scheduled_time are required' });
    }

    const newTime = new Date(scheduled_time);
    if (isNaN(newTime.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_time format' });
    }

    const { data: meeting, error: updateError } = await supabase
      .from('scheduled_meetings')
      .update({
        scheduled_time: newTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('meeting_id', meetingId)
      .select()
      .single();

    if (updateError) {
      console.error('[Meeting] Error rescheduling meeting:', updateError);
      return res.status(500).json({ error: 'Failed to reschedule meeting' });
    }

    // Fetch full details for notification
    const { data: fullMeeting } = await supabase
      .from('scheduled_meetings')
      .select(`
        *,
        group:group_id (group_id, group_name, line_group_id)
      `)
      .eq('meeting_id', meetingId)
      .single();

    // Send rescheduled notification (async)
    if (fullMeeting?.group?.line_group_id) {
      lineController.sendMeetingRescheduleNotification(fullMeeting.group.line_group_id, fullMeeting)
        .catch(err => console.error('[Meeting] Error sending reschedule notification:', err));
    }

    return res.json({ success: true, message: 'Meeting rescheduled', meeting });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ดึง meetings ทั้งหมดของกลุ่ม
 * GET /api/scheduled-meetings/group/:groupId
 */
async function getMeetingsByGroup(req, res) {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const { data: meetings, error } = await supabase
      .from('scheduled_meetings')
      .select(`
        *,
        creator:creator_id (user_id, display_name, picture_url),
        participants:meeting_participants (
          id,
          user_id,
          status,
          user:user_id (user_id, display_name, picture_url)
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('[Meeting] Error fetching meetings:', error);
      return res.status(500).json({ error: 'Failed to fetch meetings' });
    }

    return res.json({ success: true, meetings: meetings || [] });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ดึง meeting details
 * GET /api/scheduled-meetings/:meetingId
 */
async function getMeetingDetails(req, res) {
  try {
    const { meetingId } = req.params;

    if (!meetingId) {
      return res.status(400).json({ error: 'meetingId is required' });
    }

    const { data: meeting, error } = await supabase
      .from('scheduled_meetings')
      .select(`
        *,
        creator:creator_id (user_id, display_name, picture_url),
        participants:meeting_participants (
          id,
          user_id,
          status,
          user:user_id (user_id, display_name, picture_url)
        ),
        group:group_id (group_id, group_name, line_group_id)
      `)
      .eq('meeting_id', meetingId)
      .single();

    if (error) {
      console.error('[Meeting] Error fetching meeting:', error);
      return res.status(500).json({ error: 'Failed to fetch meeting' });
    }

    return res.json({ success: true, meeting });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ยืนยันการเข้าร่วมการประชุม
 * PUT /api/scheduled-meetings/:meetingId/participants/:userId
 * Body: { status: 'accepted' | 'declined' }
 */
async function updateParticipantStatus(req, res) {
  try {
    const { meetingId, userId } = req.params;
    const { status } = req.body;

    if (!meetingId || !userId || !status) {
      return res.status(400).json({ error: 'meetingId, userId, and status are required' });
    }

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'status must be accepted or declined' });
    }

    const updateData = { status };
    if (status === 'accepted') {
      updateData.joined_at = new Date().toISOString();
    }

    const { data: participant, error } = await supabase
      .from('meeting_participants')
      .update(updateData)
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Meeting] Error updating participant status:', error);
      return res.status(500).json({ error: 'Failed to update participant status' });
    }

    return res.json({ success: true, message: 'Participant status updated', participant });
  } catch (error) {
    console.error('[Meeting] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ส่งการแจ้งเตือนการประชุม (สำหรับ N8N Cron Job)
 * POST /api/scheduled-meetings/send-reminders
 * Body: { minutes: 15 } (optional, default 15)
 */
async function sendMeetingReminders(req, res) {
  try {
    const minutes = req.body?.minutes || 15;

    console.log(`[Meeting Reminder] Checking for meetings in next ${minutes} minutes...`);

    // Get upcoming meetings
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60000);
    const nowISO = now.toISOString();
    const futureISO = futureTime.toISOString();

    const { data: upcomingMeetings, error: fetchError } = await supabase
      .from('scheduled_meetings')
      .select(`
        *,
        creator:creator_id (user_id, display_name, picture_url),
        participants:meeting_participants (
          id,
          user_id,
          status,
          user:user_id (user_id, display_name, picture_url)
        ),
        group:group_id (group_id, group_name, line_group_id)
      `)
      .eq('status', 'pending')
      .gte('scheduled_time', nowISO)
      .lte('scheduled_time', futureISO);

    if (fetchError) {
      console.error('[Meeting Reminder] Error fetching meetings:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch meetings' });
    }

    if (!upcomingMeetings || upcomingMeetings.length === 0) {
      console.log('[Meeting Reminder] No upcoming meetings found');
      return res.json({ 
        success: true, 
        message: 'No upcoming meetings to remind',
        reminded: 0 
      });
    }

    console.log(`[Meeting Reminder] Found ${upcomingMeetings.length} upcoming meetings`);

    // Send reminder for each meeting with LINE group
    let remindedCount = 0;
    const errors = [];

    for (const meeting of upcomingMeetings) {
      try {
        if (!meeting.group?.line_group_id) {
          console.warn(`[Meeting Reminder] Meeting ${meeting.meeting_id} has no LINE group`);
          errors.push(`No LINE group for meeting ${meeting.title}`);
          continue;
        }

        console.log(`[Meeting Reminder] Sending reminder for meeting: ${meeting.title}`);

        // Send LINE notification using lineController
        const result = await lineController.sendMeetingReminderNotification(
          meeting.group.line_group_id,
          meeting
        );

        if (result.success) {
          remindedCount++;
          console.log(`[Meeting Reminder] ✅ Reminder sent for meeting ${meeting.meeting_id}`);
        } else {
          errors.push(`Failed to send reminder for ${meeting.title}: ${result.error}`);
          console.error(`[Meeting Reminder] ❌ Failed to send reminder for ${meeting.meeting_id}:`, result.error);
        }
      } catch (err) {
        const errorMsg = `Error processing meeting ${meeting.meeting_id}: ${err.message}`;
        errors.push(errorMsg);
        console.error(`[Meeting Reminder] ${errorMsg}`);
      }
    }

    console.log(`[Meeting Reminder] Complete: reminded ${remindedCount}/${upcomingMeetings.length} meetings`);

    return res.json({
      success: true,
      message: `Sent ${remindedCount} meeting reminders`,
      reminded: remindedCount,
      total: upcomingMeetings.length,
      ...(errors.length > 0 && { errors })
    });
  } catch (error) {
    console.error('[Meeting Reminder] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createOrUpdateMeeting,
  getUpcomingMeetings,
  cancelMeeting,
  rescheduleMeeting,
  getMeetingsByGroup,
  getMeetingDetails,
  updateParticipantStatus,
  sendMeetingReminders
};
