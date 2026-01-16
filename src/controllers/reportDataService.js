// src/controllers/reportDataService.js
const supabase = require('../config/supabase');

async function getProjectReportData(projectId) {
  // 1. project หลัก
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      project_id,
      project_name,
      description,
      created_at,
      phases,
      group_id,
      created_by_user:users(display_name, picture_url)
    `)
    .eq('project_id', projectId)
    .single();

  if (projectError) throw projectError;

  // parse phases
  if (project.phases) {
    project.phases = JSON.parse(project.phases);
  }

  // 2. members
  const { data: members } = await supabase
    .from('group_members')
    .select(`
      role,
      users(user_id, display_name, picture_url)
    `)
    .eq('group_id', project.group_id);

  // เตรียม map สำหรับรวมสมาชิกกับจำนวนงาน
  const memberMap = {};
  (members || []).forEach(m => {
    const id = m.users?.user_id;
    const name = m.users?.display_name;
    const key = id || name || `unknown-${Math.random()}`;
    memberMap[key] = {
      userId: id,
      userName: name || 'ไม่ทราบ',
      role: m.role || 'สมาชิก',
      taskCount: 0,
    };
  });

  // 3. tasks (use project_tasks to match app schema and include assignee details)
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select(`
      *,
      assigned_user:users!project_tasks_assigned_to_fkey(user_id, display_name, picture_url)
    `)
    .eq('project_id', projectId)
    .order('created_at');

  // 3.1 participation summary per user (ผูกกับ memberMap ให้สมาชิกที่ไม่มีงานยังแสดงได้)
  (tasks || []).forEach(task => {
    const id = task.assigned_user?.user_id;
    const name = task.assigned_user?.display_name;
    if (!id && !name) return; // unassigned task
    const key = id || name;
    if (!memberMap[key]) {
      memberMap[key] = {
        userId: id,
        userName: name || 'ไม่ทราบ',
        role: '',
        taskCount: 0,
      };
    }
    memberMap[key].taskCount += 1;
  });

  const participationData = Object.values(memberMap).sort((a, b) => b.taskCount - a.taskCount);

  // 4. logs (use activity_logs table)
  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select(`
      action_type,
      description,
      created_at,
      user:users(display_name)
    `)
    .eq('project_id', projectId)
    .order('created_at');

  if (logsError) {
    console.error('[reportDataService] Error fetching logs:', logsError);
  }
  console.log('[reportDataService] Logs fetched:', logs?.length || 0, 'records');
  console.log('[reportDataService] First log sample:', JSON.stringify(logs?.[0], null, 2));

  return {
    project,
    members: members || [],
    tasks: tasks || [],
    participationData,
    logs: logs || [],
  };
}

module.exports = {
  getProjectReportData,
};
