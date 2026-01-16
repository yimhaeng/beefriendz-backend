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
      users(display_name, picture_url)
    `)
    .eq('group_id', project.group_id);

  // 3. tasks (use project_tasks to match app schema and include assignee details)
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select(`
      *,
      assigned_user:users!project_tasks_assigned_to_fkey(user_id, display_name, picture_url)
    `)
    .eq('project_id', projectId)
    .order('created_at');

  // 3.1 participation summary per user
  const participationMap = {};
  (tasks || []).forEach(task => {
    const name = task.assigned_user?.display_name;
    if (!name) return; // skip unassigned
    if (!participationMap[name]) {
      participationMap[name] = { userName: name, taskCount: 0 };
    }
    participationMap[name].taskCount += 1;
  });
  const participationData = Object.values(participationMap).sort((a, b) => b.taskCount - a.taskCount);

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
