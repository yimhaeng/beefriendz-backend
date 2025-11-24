const supabase = require('../config/supabase');

// ได้รับรายการผู้ใช้ทั้งหมด
async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, line_user_id, display_name, picture_url, created_at, updated_at');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงผู้ใช้ตาม line_user_id
async function getUserByLineId(lineUserId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, line_user_id, display_name, picture_url, created_at, updated_at')
      .eq('line_user_id', lineUserId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงผู้ใช้ตาม user_id
async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, line_user_id, display_name, picture_url, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// สร้างผู้ใช้ใหม่ (upsert ตาม line_user_id)
async function createOrUpdateUser(userObj) {
  try {
    const { line_user_id } = userObj;
    if (!line_user_id) throw new Error('line_user_id is required');

    const { data, error } = await supabase
      .from('users')
      .upsert([userObj], { onConflict: 'line_user_id' })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// อัปเดตผู้ใช้ตาม user_id
async function updateUser(userId, userObj) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(userObj)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ลบผู้ใช้ตาม user_id
async function deleteUser(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, message: 'User deleted' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Health check for users table
async function getHealth() {
  try {
    const { error, count } = await supabase
      .from('users')
      .select('user_id', { count: 'exact', head: true });

    if (error) throw error;
    return { success: true, userCount: typeof count === 'number' ? count : null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getUsers,
  getUserByLineId,
  getUserById,
  createOrUpdateUser,
  updateUser,
  deleteUser,
  getHealth,
};
