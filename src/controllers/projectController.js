const supabase = require('../config/supabase');

// ดึงโปรเจกต์ของ user ตาม line_id
async function getProjectsByLineId(lineId) {
  try {
    // ดึงข้อมูล user ก่อน
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id')
      .eq('line_id', lineId)
      .single();

    if (userError) throw new Error('User not found');
    
    const userId = userData.user_id;

    // ดึงโปรเจกต์ของ user นี้
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (projectError) throw projectError;

    return { success: true, data: projects };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงโปรเจกต์ตาม user_id
async function getProjectsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงโปรเจกต์ตาม project_id พร้อมกับงานย่อย (tasks)
async function getProjectDetailById(projectId) {
  try {
    // ดึงข้อมูลโปรเจกต์
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // ดึงงานย่อย (tasks) ของโปรเจกต์นี้
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);

    if (tasksError) throw tasksError;

    return { 
      success: true, 
      data: {
        ...project,
        tasks: tasks || []
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// สร้างโปรเจกต์ใหม่
async function createProject(userId, projectData) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          name: projectData.name,
          description: projectData.description || null,
          status: projectData.status || 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// อัปเดตโปรเจกต์
async function updateProject(projectId, projectData) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', projectId)
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ลบโปรเจกต์
async function deleteProject(projectId) {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    return { success: true, message: 'Project deleted successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getProjectsByLineId,
  getProjectsByUserId,
  getProjectDetailById,
  createProject,
  updateProject,
  deleteProject
};
