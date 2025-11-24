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

// ดึงกลุ่มตาม line_group_id (สำหรับเช็คว่ากลุ่มนี้สร้างแล้วหรือยัง)
async function getGroupByLineId(lineGroupId) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('group_id, line_group_id, group_name, created_by, created_at, updated_at')
      .eq('line_group_id', lineGroupId)
      .maybeSingle(); // ใช้ maybeSingle() แทน single() เพื่อไม่ error ถ้าไม่เจอ

    if (error) throw error;
    return { success: true, data }; // data จะเป็น null ถ้าไม่เจอ
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// สร้างหรืออัพเดตกลุ่มจาก LINE (สำหรับ n8n)
async function createOrUpdateFromLine(lineGroupId, userId, groupName = null) {
  try {
    if (!lineGroupId || !userId) {
      throw new Error('lineGroupId and userId are required');
    }

    // เช็คว่ามีกลุ่มนี้แล้วหรือยัง
    const existingResult = await getGroupByLineId(lineGroupId);
    if (!existingResult.success) {
      throw new Error(existingResult.error);
    }

    // ถ้ามีแล้ว ส่งข้อมูลกลุ่มที่มีอยู่กลับไป
    if (existingResult.data) {
      return { 
        success: true, 
        data: existingResult.data, 
        created: false,
        message: 'Group already exists'
      };
    }

    // ถ้ายังไม่มี สร้างกลุ่มใหม่
    const newGroupName = groupName || 'กลุ่ม LINE';
    const { data, error } = await supabase
      .from('groups')
      .insert([{
        line_group_id: lineGroupId,
        group_name: newGroupName,
        created_by: userId
      }])
      .select();

    if (error) throw error;
    
    const newGroup = Array.isArray(data) ? data[0] : data;
    return { 
      success: true, 
      data: newGroup, 
      created: true,
      message: 'Group created successfully'
    };
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
  getGroupByLineId,
  createOrUpdateFromLine,
  createGroup,
  updateGroup,
  deleteGroup
};
