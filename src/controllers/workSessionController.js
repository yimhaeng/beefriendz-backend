const supabase = require('../config/supabase');
const lineController = require('./lineController');

/**
 * เริ่ม work session ใหม่
 * POST /api/work-sessions/start
 * Body: { user_id, task_id }
 */
async function startWorkSession(req, res) {
  try {
    const { user_id, task_id } = req.body;

    if (!user_id || !task_id) {
      return res.status(400).json({ error: 'user_id and task_id are required' });
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

    // ถ้ามี session active อยู่แล้ว ให้ปิดก่อน
    if (existingSessions && existingSessions.length > 0) {
      for (const session of existingSessions) {
        const duration = Math.floor((new Date() - new Date(session.started_at)) / 1000);
        await supabase
          .from('work_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            status: 'completed'
          })
          .eq('session_id', session.session_id);
      }
    }

    // สร้าง session ใหม่
    const { data: newSession, error: insertError } = await supabase
      .from('work_sessions')
      .insert({
        user_id,
        task_id,
        started_at: new Date().toISOString(),
        status: 'active'
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

    // ดึงข้อมูล session
    const { data: session, error: fetchError } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // คำนวณระยะเวลา
    const duration = Math.floor((new Date() - new Date(session.started_at)) / 1000);

    // อัปเดต session
    const { data: updatedSession, error: updateError } = await supabase
      .from('work_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        status: 'completed'
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return res.status(500).json({ error: 'Failed to end work session' });
    }

    // อัปเดต presence เป็น offline
    await supabase
      .from('workspace_presence')
      .update({ is_online: false })
      .eq('session_id', session_id);

    res.json({ success: true, session: updatedSession });
  } catch (err) {
    console.error('endWorkSession error:', err);
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
      return res.status(500).json({ error: 'Failed to fetch presence' });
    }

    // Filter by group_id if provided
    let filteredPresence = presence || [];
    if (group_id && filteredPresence.length > 0) {
      filteredPresence = filteredPresence.filter(
        p => String(p?.session?.task?.project?.group_id) === String(group_id)
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
      .select('duration_seconds, status')
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
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
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

module.exports = {
  startWorkSession,
  endWorkSession,
  getActiveSessions,
  getActivePresence,
  updatePresence,
  getUserSessionHistory,
  getUserSessionStats
};
