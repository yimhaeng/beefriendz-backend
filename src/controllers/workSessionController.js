const supabase = require('../config/supabase');
const lineController = require('./lineController');

/**
 * เริ่ม work session ใหม่
 * POST /api/work-sessions/start
 * Body: { user_id, task_id, planned_duration }
 */
async function startWorkSession(req, res) {
  try {
    const { user_id, task_id, planned_duration } = req.body;

    if (!user_id || !task_id) {
      return res.status(400).json({ error: 'user_id and task_id are required' });
    }

    if (!planned_duration || planned_duration <= 0) {
      return res.status(400).json({ error: 'planned_duration (minutes) is required and must be positive' });
    }

    // ตรวจสอบว่า user มี session ที่ active อยู่แล้วหรือไม่
    const { data: existingSessions, error: checkError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .is('ended_at', null);

    if (checkError) {
      console.error('Error checking existing sessions:', checkError);
      return res.status(500).json({ error: 'Failed to check existing sessions' });
    }

    // ถ้าเจอ session อยู่สำหรับ task เดียวกัน → ให้ resume (เปลี่ยน sleep → active)
    if (existingSessions && existingSessions.length > 0) {
      const resumeSession = existingSessions.find(s => String(s.task_id) === String(task_id));
      
      if (resumeSession) {
        // Resume session เดิม - ไม่ต้องสร้างใหม่
        console.log(`[startWorkSession] Resuming session ${resumeSession.session_id} for task ${task_id}`);

        const nowIso = new Date().toISOString();
        let nextPauseDurationSeconds = resumeSession.pause_duration_seconds || 0;

        // ถ้า session เดิมอยู่ในสถานะ paused ให้คำนวณเวลาพักเพิ่มและเคลียร์ paused_at
        if (resumeSession.paused_at) {
          const pausedDuration = Math.floor((new Date() - new Date(resumeSession.paused_at)) / 1000);
          nextPauseDurationSeconds += Math.max(0, pausedDuration);
        }

        const { error: resumeUpdateError } = await supabase
          .from('work_sessions')
          .update({
            paused_at: null,
            pause_duration_seconds: nextPauseDurationSeconds,
            last_activity_at: nowIso,
            status: 'active'
          })
          .eq('session_id', resumeSession.session_id);

        if (resumeUpdateError) {
          console.error('Error resuming existing session:', resumeUpdateError);
          return res.status(500).json({ error: 'Failed to resume existing session' });
        }
        
        // อัปเดต presence เป็น active
        const { error: presenceError } = await supabase
          .from('workspace_presence')
          .update({
            is_online: true,
            last_active: nowIso,
            activity_stage: 'active'
          })
          .eq('session_id', resumeSession.session_id);

        if (presenceError) {
          console.error('Error updating presence:', presenceError);
        }

        // ดึงข้อมูล session ที่ updated
        const { data: updatedSession, error: fetchError } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('session_id', resumeSession.session_id)
          .single();

        if (fetchError) {
          console.error('Error fetching updated session:', fetchError);
          return res.status(500).json({ error: 'Failed to fetch resumed session' });
        }

        return res.json({ success: true, session: updatedSession });
      }
      
      // ถ้าเจอ session อยู่แต่ task ต่างกัน → ปิด session เก่า
      for (const session of existingSessions) {
        if (String(session.task_id) !== String(task_id)) {
          const duration = Math.floor((new Date() - new Date(session.started_at)) / 1000);
          await supabase
            .from('work_sessions')
            .update({
              ended_at: new Date().toISOString(),
              actual_duration_seconds: duration,
              status: 'completed'
            })
            .eq('session_id', session.session_id);

          // อัปเดต presence เป็น offline
          await supabase
            .from('workspace_presence')
            .update({
              is_online: false,
              activity_stage: 'offline'
            })
            .eq('session_id', session.session_id);
        }
      }
    }

    // สร้าง session ใหม่ (ถ้ายังไม่มี session สำหรับ task นี้)
    const { data: newSession, error: insertError } = await supabase
      .from('work_sessions')
      .insert({
        user_id,
        task_id,
        started_at: new Date().toISOString(),
        status: 'active',
        last_activity_at: new Date().toISOString(),
        planned_duration,
        pause_duration_seconds: 0,
        actual_duration_seconds: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating session:', insertError);
      return res.status(500).json({ error: 'Failed to create work session' });
    }

    // สร้าง presence record
    const { error: presenceError } = await supabase
      .from('workspace_presence')
      .insert({
        user_id,
        session_id: newSession.session_id,
        is_online: true,
        last_active: new Date().toISOString()
      });

    if (presenceError) {
      console.error('Error creating presence:', presenceError);
    }

    // ดึงข้อมูลเพิ่มเติมสำหรับส่ง LINE notification
    const { data: sessionWithDetails, error: detailsError } = await supabase
      .from('work_sessions')
      .select(`
        *,
        user:user_id (user_id, display_name, picture_url),
        task:task_id (
          task_id,
          task_name,
          description,
          project:project_id (
            project_id,
            project_name,
            group_id,
            groups:group_id (group_id, line_group_id)
          )
        )
      `)
      .eq('session_id', newSession.session_id)
      .single();

    // ส่ง LINE notification แจ้งเตือนไปที่ group (ไม่ block response)
    if (!detailsError && sessionWithDetails?.task?.project?.groups?.line_group_id) {
      const lineGroupId = sessionWithDetails.task.project.groups.line_group_id;
      
      // ส่ง notification แบบ async (ไม่รอ)
      lineController.sendWorkspaceInviteMessage(lineGroupId, {
        user: sessionWithDetails.user,
        task: sessionWithDetails.task,
        project: sessionWithDetails.task.project
      }).then(result => {
        if (result.success) {
          console.log('[startWorkSession] LINE notification sent successfully');
        } else {
          console.warn('[startWorkSession] LINE notification failed:', result.error);
        }
      }).catch(err => {
        console.error('[startWorkSession] LINE notification error:', err);
      });
    }

    res.json({ success: true, session: newSession });
  } catch (err) {
    console.error('startWorkSession error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * จบ work session
 * POST /api/work-sessions/end
 * Body: { session_id }
 */
async function endWorkSession(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    console.log('[endWorkSession] Starting to end session:', session_id);

    // ดึงข้อมูล session
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (fetchError) {
      console.error('[endWorkSession] Error fetching session:', fetchError);
      return res.status(404).json({ error: 'Session not found', details: fetchError.message });
    }

    if (!session) {
      console.error('[endWorkSession] Session not found:', session_id);
      return res.status(404).json({ error: 'Session not found' });
    }

    // ตรวจสอบว่า session ถูกปิดไปแล้วหรือยัง
    if (session.ended_at) {
      console.warn('[endWorkSession] Session already ended:', session_id);
      return res.json({ success: true, session, message: 'Session was already ended' });
    }

    console.log('[endWorkSession] Session found:', {
      session_id: session.session_id,
      user_id: session.user_id,
      task_id: session.task_id,
      started_at: session.started_at,
      current_status: session.status
    });

    // คำนวณระยะเวลา
    const duration = Math.floor((new Date() - new Date(session.started_at)) / 1000);
    console.log('[endWorkSession] Calculated duration:', duration, 'seconds');

    // คำนวณ actual_duration (เวลาทำงานจริง = total duration - pause duration)
    const pauseDuration = session.pause_duration_seconds || 0;
    const actualDuration = Math.max(0, duration - pauseDuration);
    console.log('[endWorkSession] Actual duration (excluding pauses):', actualDuration, 'seconds');

    // อัปเดต session
    const { data: updatedSession, error: updateError } = await supabase
      .from('work_sessions')
      .update({
        ended_at: new Date().toISOString(),
        actual_duration_seconds: actualDuration,
        status: 'completed'
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('[endWorkSession] Error updating session:', updateError);
      return res.status(500).json({ 
        error: 'Failed to end work session', 
        details: updateError.message 
      });
    }

    if (!updatedSession) {
      console.error('[endWorkSession] No session returned after update');
      return res.status(500).json({ error: 'Failed to update session - no data returned' });
    }

    console.log('[endWorkSession] Session updated successfully:', {
      session_id: updatedSession.session_id,
      ended_at: updatedSession.ended_at,
      actual_duration_seconds: updatedSession.actual_duration_seconds,
      status: updatedSession.status
    });

    // อัปเดต presence เป็น offline
    const { error: presenceError } = await supabase
      .from('workspace_presence')
      .update({ 
        is_online: false,
        activity_stage: 'offline'
      })
      .eq('session_id', session_id);

    if (presenceError) {
      console.error('[endWorkSession] Error updating presence:', presenceError);
      // ไม่ return error เพราะ session ถูกปิดแล้ว
    } else {
      console.log('[endWorkSession] Presence updated to offline');
    }

    console.log('[endWorkSession] End session completed successfully');
    res.json({ success: true, session: updatedSession });
  } catch (err) {
    console.error('[endWorkSession] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ดึงข้อมูล active sessions ทั้งหมด (หรือของ group)
 * GET /api/work-sessions/active?group_id=xxx
 */
async function getActiveSessions(req, res) {
  try {
    const { group_id } = req.query;

    let query = supabase
      .from('work_sessions')
      .select(`
        *,
        user:user_id (user_id, display_name, line_user_id, picture_url),
        task:task_id (
          task_id,
          task_name,
          description,
          status,
          project:project_id (project_id, project_name, group_id)
        )
      `)
      .eq('status', 'active')
      .is('ended_at', null)
      .order('started_at', { ascending: false });

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching active sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch active sessions' });
    }

    // Filter by group_id if provided
    let filteredSessions = sessions || [];
    if (group_id && filteredSessions.length > 0) {
      filteredSessions = filteredSessions.filter(
        s => String(s?.task?.project?.group_id) === String(group_id)
      );
    }

    res.json({ success: true, sessions: filteredSessions });
  } catch (err) {
    console.error('getActiveSessions error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ดึงข้อมูล session โดย ID เพื่อ sync state กับ frontend
 * GET /api/work-sessions/:sessionId
 */
async function getSessionById(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const { data: session, error } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !session) {
      console.error('Session not found:', error);
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (err) {
    console.error('getSessionById error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ดึงข้อมูล active presence (users ที่ online) ของ group
 * GET /api/work-sessions/presence?group_id=xxx
 */
async function getActivePresence(req, res) {
  try {
    const { group_id } = req.query;

    // Cleanup presence ที่ offline เกิน 5 นาที (ถ้า function มีอยู่)
    try {
      await supabase.rpc('cleanup_offline_presence');
    } catch (rpcError) {
      console.warn('[getActivePresence] cleanup_offline_presence failed:', rpcError?.message || rpcError);
    }

    const { data: presence, error } = await supabase
      .from('workspace_presence')
      .select(`
        *,
        user:user_id (user_id, display_name, line_user_id, picture_url),
        session:session_id (
          session_id,
          started_at,
          task:task_id (
            task_id,
            task_name,
            description,
            status,
            project:project_id (project_id, project_name, group_id)
          )
        )
      `)
      .eq('is_online', true)
      .order('last_active', { ascending: false });

    if (error) {
      console.error('Error fetching presence:', error);
      // Return empty array instead of error when no active sessions
      return res.json({ success: true, presence: [] });
    }

    // Filter by group_id if provided
    let filteredPresence = presence || [];
    if (group_id && filteredPresence.length > 0) {
      filteredPresence = filteredPresence.filter(
        p => p?.session?.task?.project?.group_id && String(p.session.task.project.group_id) === String(group_id)
      );
    }

    res.json({ success: true, presence: filteredPresence });
  } catch (err) {
    console.error('getActivePresence error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * อัปเดต presence (heartbeat)
 * POST /api/work-sessions/heartbeat
 * Body: { session_id }
 */
async function updatePresence(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const { error } = await supabase
      .from('workspace_presence')
      .update({ 
        last_active: new Date().toISOString(),
        is_online: true 
      })
      .eq('session_id', session_id);

    if (error) {
      console.error('Error updating presence:', error);
      return res.status(500).json({ error: 'Failed to update presence' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('updatePresence error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ดึงประวัติ work sessions ของ user
 * GET /api/work-sessions/history/:userId
 */
async function getUserSessionHistory(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data: sessions, error } = await supabase
      .from('work_sessions')
      .select(`
        *,
        task:task_id (id, title, description, status, project_id)
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching session history:', error);
      return res.status(500).json({ error: 'Failed to fetch session history' });
    }

    res.json({ success: true, sessions });
  } catch (err) {
    console.error('getUserSessionHistory error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ดึงสถิติ work sessions ของ user
 * GET /api/work-sessions/stats/:userId
 */
async function getUserSessionStats(req, res) {
  try {
    const { userId } = req.params;
    const { period = '7days' } = req.query; // 7days, 30days, all

    let dateFilter = '';
    if (period === '7days') {
      dateFilter = `started_at.gte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`;
    } else if (period === '30days') {
      dateFilter = `started_at.gte.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`;
    }

    let query = supabase
      .from('work_sessions')
      .select('status, actual_duration_seconds')
      .eq('user_id', userId);

    if (dateFilter) {
      const date = new Date(Date.now() - (period === '7days' ? 7 : 30) * 24 * 60 * 60 * 1000);
      query = query.gte('started_at', date.toISOString());
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching session stats:', error);
      return res.status(500).json({ error: 'Failed to fetch session stats' });
    }

    // คำนวณสถิติ
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.actual_duration_seconds || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(2);
    const avgSessionMinutes = totalSessions > 0 
      ? ((totalSeconds / totalSessions) / 60).toFixed(2) 
      : 0;

    res.json({
      success: true,
      stats: {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        total_hours: parseFloat(totalHours),
        average_session_minutes: parseFloat(avgSessionMinutes),
        period
      }
    });
  } catch (err) {
    console.error('getUserSessionStats error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * อัปเดต activity stage (active/sleep/offline)
 * POST /api/work-sessions/activity-stage
 * Body: { session_id, activity_stage }
 */
async function updateActivityStage(req, res) {
  try {
    const { session_id, activity_stage } = req.body;

    if (!session_id || !activity_stage) {
      return res.status(400).json({ error: 'session_id and activity_stage are required' });
    }

    if (!['active', 'sleep', 'offline'].includes(activity_stage)) {
      return res.status(400).json({ error: 'Invalid activity_stage value' });
    }

    // อัปเดต presence stage และ last_activity_at
    const { error: updateError } = await supabase
      .from('workspace_presence')
      .update({
        activity_stage,
        last_active: new Date().toISOString()
      })
      .eq('session_id', session_id);

    if (updateError) {
      console.error('Error updating activity stage:', updateError);
      return res.status(500).json({ error: 'Failed to update activity stage' });
    }

    // อัปเดต last_activity_at ใน work_sessions ด้วย
    if (activity_stage === 'active') {
      await supabase
        .from('work_sessions')
        .update({
          last_activity_at: new Date().toISOString()
        })
        .eq('session_id', session_id);
    }

    res.json({ success: true, stage: activity_stage });
  } catch (err) {
    console.error('updateActivityStage error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * หยุดพัก (Pause) work session
 * POST /api/work-sessions/pause
 * Body: { session_id }
 */
async function pauseWorkSession(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // ดึงข้อมูล session
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ตรวจสอบว่า session ยังไม่จบและไม่ได้พักอยู่แล้ว
    if (session.ended_at) {
      return res.status(400).json({ error: 'Session already ended' });
    }

    if (session.paused_at) {
      return res.status(400).json({ error: 'Session is already paused' });
    }

    // บันทึกเวลาที่หยุดพัก
    const { data: updatedSession, error: updateError } = await supabase
      .from('work_sessions')
      .update({
        paused_at: new Date().toISOString()
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error pausing session:', updateError);
      return res.status(500).json({ error: 'Failed to pause session' });
    }

    // อัปเดต presence เป็น sleep
    await supabase
      .from('workspace_presence')
      .update({ 
        activity_stage: 'sleep',
        last_active: new Date().toISOString()
      })
      .eq('session_id', session_id);

    res.json({ success: true, session: updatedSession });
  } catch (err) {
    console.error('pauseWorkSession error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * กลับมาทำต่อ (Resume) work session
 * POST /api/work-sessions/resume
 * Body: { session_id }
 */
async function resumeWorkSession(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // ดึงข้อมูล session
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ตรวจสอบว่า session กำลังพักอยู่
    if (!session.paused_at) {
      return res.status(400).json({ error: 'Session is not paused' });
    }

    if (session.ended_at) {
      return res.status(400).json({ error: 'Session already ended' });
    }

    // คำนวณเวลาที่พักไป
    const pausedDuration = Math.floor((new Date() - new Date(session.paused_at)) / 1000);
    const totalPauseDuration = (session.pause_duration_seconds || 0) + pausedDuration;

    // อัปเดต session
    const { data: updatedSession, error: updateError } = await supabase
      .from('work_sessions')
      .update({
        paused_at: null,
        pause_duration_seconds: totalPauseDuration,
        last_activity_at: new Date().toISOString()
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error resuming session:', updateError);
      return res.status(500).json({ error: 'Failed to resume session' });
    }

    // อัปเดต presence เป็น active
    await supabase
      .from('workspace_presence')
      .update({ 
        activity_stage: 'active',
        is_online: true,
        last_active: new Date().toISOString()
      })
      .eq('session_id', session_id);

    res.json({ success: true, session: updatedSession });
  } catch (err) {
    console.error('resumeWorkSession error:', err);
    res.status(500).json({ error: err.message });
  }
}

const SLEEP_AUTO_END_MINUTES = 30;

/**
 * Check และ auto-end sessions ที่อยู่ sleep mode ครบ 30 นาที
 * POST /api/work-sessions/check-auto-end-sleep
 * Body: { session_id }
 */
async function checkAndAutoEndSleepSessions(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // หา session
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'active')
      .is('ended_at', null)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found or already ended' });
    }

    // ตรวจสอบว่า sleep ครบ 30 นาทีหรือไม่
    const lastActivityTime = new Date(session.last_activity_at || session.started_at);
    const timeDiffMinutes = (new Date() - lastActivityTime) / (1000 * 60);

    if (timeDiffMinutes >= SLEEP_AUTO_END_MINUTES) {
      // Auto end session
      const duration = Math.floor((new Date() - new Date(session.started_at)) / 1000);
      
      const { data: updatedSession, error: updateError } = await supabase
        .from('work_sessions')
        .update({
          ended_at: new Date().toISOString(),
          actual_duration_seconds: duration,
          status: 'completed'
        })
        .eq('session_id', session_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error auto-ending session:', updateError);
        return res.status(500).json({ error: 'Failed to auto-end session' });
      }

      // อัปเดต presence เป็น offline
      await supabase
        .from('workspace_presence')
        .update({ activity_stage: 'offline', is_online: false })
        .eq('session_id', session_id);

      console.log(`[checkAndAutoEndSleepSessions] Session ${session_id} auto-ended after ${timeDiffMinutes} minutes`);
      
      return res.json({ success: true, auto_ended: true, reason: 'sleep_timeout', session: updatedSession });
    }

    res.json({
      success: true,
      auto_ended: false,
      remaining_minutes: Math.max(0, Math.ceil(SLEEP_AUTO_END_MINUTES - timeDiffMinutes))
    });
  } catch (err) {
    console.error('checkAndAutoEndSleepSessions error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * ตรวจสอบและแจ้งเตือนเมื่อ timebox หมดเวลา
 * POST /api/work-sessions/check-timeup
 * Body: { session_id }
 */
async function checkAndNotifyTimeUp(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // ดึงข้อมูล session พร้อมรายละเอียด
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select(`
        *,
        user:user_id (user_id, display_name, picture_url),
        task:task_id (
          task_id,
          task_name,
          description,
          project:project_id (
            project_id,
            project_name,
            group_id,
            groups:group_id (group_id, line_group_id)
          )
        )
      `)
      .eq('session_id', session_id)
      .eq('status', 'active')
      .is('ended_at', null)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // ตรวจสอบว่ามี planned_duration หรือไม่
    if (!session.planned_duration) {
      return res.json({ success: true, time_up: false, message: 'No timebox set' });
    }

    // คำนวณเวลาที่เหลือ
    const startedAt = new Date(session.started_at).getTime();
    const plannedSeconds = session.planned_duration * 60;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const pauseDuration = session.pause_duration_seconds || 0;
    const actualElapsed = elapsed - pauseDuration;
    const remaining = plannedSeconds - actualElapsed;

    // ถ้ายังไม่หมดเวลา
    if (remaining > 0) {
      return res.json({
        success: true,
        time_up: false,
        remaining_seconds: remaining
      });
    }

    // หมดเวลาแล้ว - ส่ง notification
    console.log('[checkAndNotifyTimeUp] Time is up for session:', session_id);

    // ส่ง LINE notification
    if (session.task?.project?.groups?.line_group_id) {
      const lineGroupId = session.task.project.groups.line_group_id;
      
      // ส่ง notification แบบ async
      lineController.sendTimeUpNotification(lineGroupId, {
        user: session.user,
        task: session.task,
        project: session.task.project,
        duration: session.planned_duration
      }).then(result => {
        if (result.success) {
          console.log('[checkAndNotifyTimeUp] LINE notification sent successfully');
        } else {
          console.warn('[checkAndNotifyTimeUp] LINE notification failed:', result.error);
        }
      }).catch(err => {
        console.error('[checkAndNotifyTimeUp] LINE notification error:', err);
      });
    }

    res.json({
      success: true,
      time_up: true,
      elapsed_seconds: actualElapsed,
      planned_seconds: plannedSeconds
    });

  } catch (err) {
    console.error('checkAndNotifyTimeUp error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Extend work session - add more time to planned_duration
 * POST /api/work-sessions/extend
 * Body: { session_id, additional_minutes }
 */
async function extendWorkSession(req, res) {
  try {
    const { session_id, additional_minutes } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    if (!additional_minutes || additional_minutes <= 0) {
      return res.status(400).json({ error: 'additional_minutes must be greater than 0' });
    }

    // ดึงข้อมูล session
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.ended_at) {
      return res.status(400).json({ error: 'Session already ended' });
    }

    // Update planned_duration by adding additional_minutes
    const newPlannedDuration = (session.planned_duration || 0) + additional_minutes;

    const { data: updatedSession, error: updateError } = await supabase
      .from('work_sessions')
      .update({
        planned_duration: newPlannedDuration,
        last_activity_at: new Date().toISOString()
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error extending session:', updateError);
      return res.status(500).json({ error: 'Failed to extend session' });
    }

    res.json({ success: true, session: updatedSession });
  } catch (err) {
    console.error('extendWorkSession error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  startWorkSession,
  endWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  extendWorkSession,
  getActiveSessions,
  getSessionById,
  getActivePresence,
  updatePresence,
  updateActivityStage,
  checkAndAutoEndSleepSessions,
  checkAndNotifyTimeUp,
  getUserSessionHistory,
  getUserSessionStats
};
