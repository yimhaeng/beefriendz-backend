const supabase = require('../config/supabase');

// ดึงสมาชิกทั้งหมดของกลุ่ม (พร้อมข้อมูล user)
async function getMembersByGroupId(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        group_id,
        user_id,
        role,
        joined_at,
        users!inner(user_id, display_name, picture_url)
      `)
      .eq('group_id', groupId);

    if (error) throw error;
    
    // Flatten the data: merge user info into member object
    const flattenedData = data.map(member => ({
      id: member.id,
      group_id: member.group_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      display_name: member.users.display_name,
      picture_url: member.users.picture_url,
    }));
    
    return { success: true, data: flattenedData };
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

// อัปเดต role สมาชิกด้วย groupId และ userId
async function updateMemberRole(groupId, userId, role) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select('*, users(user_id, display_name, picture_url)');

    if (error) throw error;
    return { success: true, data: Array.isArray(data) ? data[0] : data };
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

// ดึงข้อมูลการเป็นสมาชิกทั้งหมดของ user (ว่าอยู่กลุ่มไหนบ้าง)
async function getMembershipsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        group_id,
        user_id,
        role,
        joined_at
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getMembersByGroupId,
  getMembershipsByUserId,
  checkMembership,
  addMember,
  updateMember,
  updateMemberRole,
  removeMember,
};
