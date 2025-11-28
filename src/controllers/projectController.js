const supabase = require('../config/supabase');

// ========== PROJECTS ==========

// Get all projects by group_id
async function getProjectsByGroup(groupId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_user:users!projects_created_by_fkey(user_id, display_name, picture_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Parse phases from JSON string to array
    const parsedData = data.map(project => ({
      ...project,
      phases: project.phases ? JSON.parse(project.phases) : null
    }));
    
    return { success: true, data: parsedData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get single project by ID
async function getProjectById(projectId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_user:users!projects_created_by_fkey(user_id, display_name, picture_url)
      `)
      .eq('project_id', projectId)
      .single();

    if (error) throw error;
    
    // Parse phases from JSON string to array
    if (data && data.phases) {
      data.phases = JSON.parse(data.phases);
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create new project
async function createProject(projectData) {
  try {
    console.log('[createProject] Input data:', JSON.stringify(projectData, null, 2));
    
    // เช็คว่ากลุ่มนี้มีโปรเจกต์แล้วหรือยัง
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('project_id, project_name')
      .eq('group_id', projectData.group_id)
      .maybeSingle();

    if (checkError) {
      console.error('[createProject] Check error:', checkError);
      throw checkError;
    }

    if (existingProject) {
      console.log('[createProject] Project already exists:', existingProject);
      return { 
        success: false, 
        error: `กลุ่มนี้มีโปรเจกต์แล้ว: "${existingProject.project_name}"`,
        existingProjectId: existingProject.project_id
      };
    }

    // ถ้ายังไม่มี ให้สร้างโปรเจกต์ใหม่
    console.log('[createProject] Inserting new project...');
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select();

    if (error) {
      console.error('[createProject] Insert error:', error);
      throw error;
    }
    
    console.log('[createProject] Project created:', data);
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    console.error('[createProject] Exception:', error);
    return { success: false, error: error.message };
  }
}

// Update project
async function updateProject(projectId, projectData) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('project_id', projectId)
      .select();

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Delete project
async function deleteProject(projectId) {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;
    return { success: true, message: 'Project deleted' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== TASKS ==========

// Get all tasks by project_id
async function getTasksByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        assigned_user:users!project_tasks_assigned_to_fkey(user_id, display_name, picture_url),
        created_by_user:users!project_tasks_created_by_fkey(user_id, display_name, picture_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get single task by ID
async function getTaskById(taskId) {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project:projects(project_id, project_name, group_id),
        assigned_user:users!project_tasks_assigned_to_fkey(user_id, display_name, picture_url),
        created_by_user:users!project_tasks_created_by_fkey(user_id, display_name, picture_url),
        attachments:task_attachments(*),
        comments:task_comments(*, user:users(user_id, display_name, picture_url))
      `)
      .eq('task_id', taskId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create new task
async function createTask(taskData) {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .insert([taskData])
      .select();

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update task
async function updateTask(taskId, taskData) {
  try {
    // ดึงข้อมูลงานเก่าก่อน (เพื่อเปรียบเทียบสถานะ)
    const { data: oldTask, error: fetchError } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (fetchError) throw fetchError;

    // ลบ updated_by ออกจาก taskData เพื่อไม่ให้ส่งไปยัง database
    const { updated_by, ...taskUpdateData } = taskData;

    // อัปเดตงาน
    const { data, error } = await supabase
      .from('project_tasks')
      .update(taskUpdateData)
      .eq('task_id', taskId)
      .select();

    if (error) throw error;

    // ถ้ามีการเปลี่ยนสถานะ ให้บันทึก activity log
    if (taskData.status && oldTask.status !== taskData.status) {
      const logData = {
        project_id: oldTask.project_id,
        task_id: taskId,
        user_id: updated_by || oldTask.assigned_to,
        action_type: 'status_change',
        description: `เปลี่ยนสถานะจาก ${oldTask.status} เป็น ${taskData.status}`,
        old_value: oldTask.status,
        new_value: taskData.status,
      };

      console.log('[updateTask] Creating activity log:', logData);

      const { data: logResult, error: logError } = await supabase
        .from('activity_logs')
        .insert([logData])
        .select();

      if (logError) {
        console.error('Failed to create activity log:', logError);
        // ไม่ throw error เพื่อไม่ให้การอัปเดต task ล้มเหลว
      } else {
        console.log('[updateTask] Activity log created:', logResult);
      }

      // ตรวจสอบว่างานทั้งหมดเสร็จสิ้นหรือยัง (เมื่อเปลี่ยนเป็น completed)
      if (taskData.status === 'completed') {
        await checkAndUpdateProjectCompletion(oldTask.project_id);
      }
    }

    return { success: true, data: Array.isArray(data) ? data[0] : data, project_id: oldTask.project_id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Delete task
async function deleteTask(taskId) {
  try {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('task_id', taskId);

    if (error) throw error;
    return { success: true, message: 'Task deleted' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get tasks by assigned user
async function getTasksByUser(userId) {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project:projects(project_id, project_name, group_id),
        assigned_user:users!project_tasks_assigned_to_fkey(user_id, display_name, picture_url)
      `)
      .eq('assigned_to', userId)
      .order('deadline', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get tasks near deadline (for cron notification)
async function getTasksNearDeadline(daysAhead = 2) {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project:projects(project_id, project_name, group_id, groups(line_group_id)),
        assigned_user:users!project_tasks_assigned_to_fkey(user_id, display_name, line_user_id)
      `)
      .eq('status', 'pending')
      .gte('deadline', today.toISOString().split('T')[0])
      .lte('deadline', futureDate.toISOString().split('T')[0]);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== ATTACHMENTS ==========

// Get attachments by task_id
async function getAttachmentsByTask(taskId) {
  try {
    const { data, error } = await supabase
      .from('task_attachments')
      .select(`
        *,
        uploaded_by_user:users(user_id, display_name, picture_url)
      `)
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create attachment (save file URL)
async function createAttachment(attachmentData) {
  try {
    const { data, error } = await supabase
      .from('task_attachments')
      .insert([attachmentData])
      .select();

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Delete attachment
async function deleteAttachment(attachmentId) {
  try {
    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('attachment_id', attachmentId);

    if (error) throw error;
    return { success: true, message: 'Attachment deleted' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== ACTIVITY LOGS ==========

// Get logs by project_id
async function getLogsByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(user_id, display_name, picture_url),
        task:project_tasks(task_id, task_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create activity log
async function createLog(logData) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([logData])
      .select();

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== COMMENTS ==========

// Get comments by task_id
async function getCommentsByTask(taskId) {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:users(user_id, display_name, picture_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create comment
async function createComment(commentData) {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .insert([commentData])
      .select();

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update comment
async function updateComment(commentId, commentData) {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .update(commentData)
      .eq('comment_id', commentId)
      .select();

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Delete comment
async function deleteComment(commentId) {
  try {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('comment_id', commentId);

    if (error) throw error;
    return { success: true, message: 'Comment deleted' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ตรวจสอบและอัพเดทสถานะโปรเจกต์เมื่องานทั้งหมดเสร็จสิ้น
async function checkAndUpdateProjectCompletion(projectId) {
  try {
    console.log(`[checkProjectCompletion] Checking project ${projectId}`);

    // ดึงงานทั้งหมดในโปรเจกต์
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('task_id, status')
      .eq('project_id', projectId);

    if (tasksError) throw tasksError;

    // ตรวจสอบว่ามีงานหรือไม่
    if (!tasks || tasks.length === 0) {
      console.log(`[checkProjectCompletion] No tasks in project ${projectId}`);
      return { success: false, message: 'No tasks in project' };
    }

    // ตรวจสอบว่างานทั้งหมดเสร็จสิ้นหรือยัง
    const allCompleted = tasks.every(task => task.status === 'completed');
    console.log(`[checkProjectCompletion] All tasks completed: ${allCompleted} (${tasks.filter(t => t.status === 'completed').length}/${tasks.length})`);

    if (allCompleted) {
      // อัพเดทสถานะโปรเจกต์เป็น achieved
      const { data: project, error: updateError } = await supabase
        .from('projects')
        .update({ status: 'achieved' })
        .eq('project_id', projectId)
        .select('*, groups(line_group_id)')
        .single();

      if (updateError) throw updateError;

      console.log(`[checkProjectCompletion] ✅ Project ${projectId} marked as ACHIEVED!`);

      // ส่ง LINE notification
      if (project?.groups?.line_group_id) {
        const lineController = require('./lineController');
        await lineController.sendProjectCompletedMessage(
          project.groups.line_group_id,
          {
            project_id: project.project_id,
            project_name: project.project_name,
            total_tasks: tasks.length
          }
        );
      }

      return { success: true, achieved: true };
    }

    return { success: true, achieved: false };
  } catch (error) {
    console.error('[checkProjectCompletion] Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  // Projects
  getProjectsByGroup,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  
  // Tasks
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTasksByUser,
  getTasksNearDeadline,
  
  // Attachments
  getAttachmentsByTask,
  createAttachment,
  deleteAttachment,
  
  // Logs
  getLogsByProject,
  createLog,
  
  // Comments
  getCommentsByTask,
  createComment,
  updateComment,
  deleteComment,

  // Project Completion
  checkAndUpdateProjectCompletion,
};
