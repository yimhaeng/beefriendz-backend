const supabase = require('../config/supabase');

// ดึงข้อมูลทั้งหมด
async function getAllData(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงข้อมูลตาม ID
async function getDataById(tableName, id) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// สร้างข้อมูลใหม่
async function createData(tableName, dataObj) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert([dataObj])
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// แก้ไขข้อมูล
async function updateData(tableName, id, dataObj) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update(dataObj)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ลบข้อมูล
async function deleteData(tableName, id) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true, message: 'Data deleted successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAllData,
  getDataById,
  createData,
  updateData,
  deleteData
};
