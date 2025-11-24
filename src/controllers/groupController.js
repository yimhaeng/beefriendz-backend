const supabase = require('../config/supabase');

// ดึงรายการกลุ่มทั้งหมด
async function getGroups() {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('group_id, line_group_id, group_name, created_by, created_at, updated_at');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงกลุ่มตาม group_id
async function getGroupById(groupId) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('group_id, line_group_id, group_name, created_by, created_at, updated_at')
      .eq('group_id', groupId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// สร้างกลุ่มใหม่
async function createGroup(groupObj) {
  try {
    if (!groupObj.line_group_id || !groupObj.group_name || !groupObj.created_by) {
      throw new Error('line_group_id, group_name and created_by are required');
    }

    const { data, error } = await supabase
      .from('groups')
      .insert([groupObj])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// อัปเดตกลุ่ม
async function updateGroup(groupId, groupObj) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update(groupObj)
      .eq('group_id', groupId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ลบกลุ่ม
async function deleteGroup(groupId) {
  try {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('group_id', groupId);

    if (error) throw error;
    return { success: true, message: 'Group deleted' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup
};
