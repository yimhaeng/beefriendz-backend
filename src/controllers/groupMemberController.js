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

// เช็คว่า user เป็นสมาชิกกลุ่มนี้แล้วหรือยัง
async function checkMembership(groupId, userId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, role, joined_at')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data, isMember: !!data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// เพิ่มสมาชิกให้กลุ่ม
async function addMember(groupId, userId, role = 'member') {
  try {
    // เช็คว่าเป็นสมาชิกอยู่แล้วหรือไม่
    const checkResult = await checkMembership(groupId, userId);
    if (!checkResult.success) {
      throw new Error(checkResult.error);
    }
    
    if (checkResult.isMember) {
      // ถ้าเป็นสมาชิกอยู่แล้ว ส่งข้อมูลเดิมกลับไป
      return { success: true, data: checkResult.data, alreadyMember: true };
    }

    // ถ้ายังไม่เป็นสมาชิก ให้เพิ่มเข้าไป
    const payload = { group_id: groupId, user_id: userId, role };
    const { data, error } = await supabase
      .from('group_members')
      .insert([payload])
      .select();

    if (error) throw error;
    return { success: true, data, alreadyMember: false };
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
  checkMembership,
  addMember,
  updateMember,
  removeMember,
};
