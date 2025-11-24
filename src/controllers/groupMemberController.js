const supabase = require('../config/supabase');

// ดึงสมาชิกทั้งหมดของกลุ่ม
async function getMembersByGroupId(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, role, joined_at')
      .eq('group_id', groupId);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// เพิ่มสมาชิกให้กลุ่ม
async function addMember(groupId, userId, role = 'member') {
  try {
    const payload = { group_id: groupId, user_id: userId, role };
    const { data, error } = await supabase
      .from('group_members')
      .insert([payload])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// อัปเดต role สมาชิก
async function updateMember(memberId, role) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('id', memberId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ลบสมาชิกจากกลุ่ม
async function removeMember(memberId) {
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
    return { success: true, message: 'Member removed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getMembersByGroupId,
  addMember,
  updateMember,
  removeMember,
};
