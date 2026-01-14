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

  // 3. tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');

  // 4. logs
  const { data: logs } = await supabase
    .from('task_logs')
    .select(`
      action,
      detail,
      created_at,
      users(display_name)
    `)
    .eq('project_id', projectId)
    .order('created_at');

  return {
    project,
    members: members || [],
    tasks: tasks || [],
    logs: logs || [],
  };
}

module.exports = {
  getProjectReportData,
};
