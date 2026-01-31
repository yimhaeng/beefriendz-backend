const axios = require('axios');

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message/push';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

/**
 * ส่ง Flex Message แจ้งโปรเจกต์ใหม่ไปยังกลุ่ม LINE
 */
async function sendProjectCreatedMessage(lineGroupId, projectData) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }

    // LIFF URL should be the LIFF endpoint, not the Vercel URL
    const liffUrl = process.env.LIFF_URL || 'https://liff.line.me/2008277186-xq681oX3';
    const projectUrl = `${liffUrl}/projectdetail/${projectData.project_id}`;
    
    console.log('[LINE] Sending message to group:', lineGroupId);
    console.log('[LINE] Project URL:', projectUrl);

    const flexMessage = {
      type: 'flex',
      altText: `สร้างโปรเจกต์ "${projectData.project_name}" สำเร็จ!`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'โปรเจกต์ใหม่!',
              weight: 'bold',
              size: 'xl',
              color: '#000000ff'
            }
          ],
          backgroundColor: '#FFA500',
          paddingAll: '20px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: projectData.project_name,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            ...(projectData.description ? [{
              type: 'text',
              text: projectData.description,
              size: 'sm',
              color: '#000000',
              margin: 'md',
              wrap: true
            }] : []),
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                ...(projectData.start_date ? [{
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'เริ่ม:',
                      size: 'sm',
                      color: '#555555',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: new Date(projectData.start_date).toLocaleDateString('th-TH'),
                      size: 'sm',
                      color: '#111111',
                      align: 'end'
                    }
                  ]
                }] : []),
                ...(projectData.end_date ? [{
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'สิ้นสุด:',
                      size: 'sm',
                      color: '#555555',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: new Date(projectData.end_date).toLocaleDateString('th-TH'),
                      size: 'sm',
                      color: '#111111',
                      align: 'end'
                    }
                  ]
                }] : [])
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดโปรเจกต์',
                uri: projectUrl
              },
              color: '#FFA500'
            }
          ]
        }
      }
    };

    const response = await axios.post(
      LINE_MESSAGING_API,
      {
        to: lineGroupId,
        messages: [flexMessage]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('[LINE] Flex message sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[LINE] Error sending flex message:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

/**
 * ส่ง Flex Message แจ้งเตือนการเปลี่ยนสถานะงาน
 */
async function sendTaskStatusUpdateMessage(lineGroupId, taskData) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }

    const { task_name, status, old_status, assigned_user, updated_by_user, project } = taskData;
    
    // สร้าง status emoji และข้อความ
    const statusConfig = {
      'todo': { text: 'รอดำเนินการ', color: '#040000' },
      'in_progress': { text: 'กำลังทำ', color: '#f8a720' },
      'reviewing': { text: 'รอตรวจสอบ', color: '#f8a720' },
      'submitted': { text: 'รอหัวหน้าอนุมัติ', color: '#f8a720' },
      'completed': { text: 'เสร็จสิ้น', color: '#f8a720' }
    };

    const newStatusInfo = statusConfig[status] || { text: status, color: '#6B7280' };
    const oldStatusInfo = statusConfig[old_status] || { text: old_status, color: '#6B7280' };

    const liffUrl = process.env.LIFF_URL || 'https://liff.line.me/2008277186-xq681oX3';
    const projectUrl = `${liffUrl}/projectdetail/${project.project_id}`;

    const flexMessage = {
      type: 'flex',
      altText: `งาน "${task_name}" เปลี่ยนเป็น ${newStatusInfo.text}`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `อัปเดตสถานะงาน`,
              weight: 'bold',
              size: 'lg',
              color: '#000000ff'
            }
          ],
          backgroundColor: newStatusInfo.color,
          paddingAll: '15px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: task_name,
              weight: 'bold',
              size: 'md',
              wrap: true,
              color: '#1F2937'
            },
            {
              type: 'box',
              layout: 'baseline',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'โปรเจกต์:',
                  size: 'xs',
                  color: '#6B7280',
                  flex: 0,
                  margin: 'none'
                },
                {
                  type: 'text',
                  text: project.project_name,
                  size: 'xs',
                  color: '#374151',
                  wrap: true,
                  margin: 'sm'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'สถานะใหม่:',
                      size: 'sm',
                      color: '#6B7280',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: `${newStatusInfo.text}`,
                      size: 'sm',
                      color: '#000000',
                      align: 'end',
                      weight: 'bold'
                    }
                  ]
                },
                ...(assigned_user ? [{
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: 'ผู้รับผิดชอบ:',
                      size: 'sm',
                      color: '#6B7280',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: assigned_user.display_name,
                      size: 'sm',
                      color: '#374151',
                      align: 'end'
                    }
                  ]
                }] : []),
                ...(updated_by_user ? [{
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'อัปเดตโดย:',
                      size: 'sm',
                      color: '#6B7280',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: updated_by_user.display_name,
                      size: 'sm',
                      color: '#374151',
                      align: 'end'
                    }
                  ]
                }] : [])
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'uri',
                label: 'ดูโปรเจกต์',
                uri: projectUrl
              },
              color: newStatusInfo.color,
              height: 'sm'
            }
          ]
        }
      }
    };

    const response = await axios.post(
      LINE_MESSAGING_API,
      {
        to: lineGroupId,
        messages: [flexMessage]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('[LINE] Task status update message sent successfully');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[LINE] Error sending task status update:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

/**
 * ส่ง Flex Message แจ้งเตือนงานที่ใกล้ถึง deadline
 */
async function sendDeadlineReminder(lineGroupId, tasksData) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }

    if (!tasksData || tasksData.length === 0) {
      console.log('[LINE] No tasks to send deadline reminder');
      return { success: true, message: 'No tasks to remind' };
    }

    const liffUrl = process.env.LIFF_URL || 'https://liff.line.me/2008277186-xq681oX3';

    // สร้าง bubble สำหรับแต่ละงาน
    const taskBubbles = tasksData.map(task => {
      const deadlineDate = new Date(task.deadline);
      const today = new Date();
      const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      
      const urgencyColor = daysLeft <= 1 ? '#EF4444' : daysLeft <= 2 ? '#F59E0B' : '#10B981';
      const urgencyText = daysLeft <= 0 ? 'เลยเดดไลน์!' : daysLeft === 1 ? 'พรุ่งนี้!' : `อีก ${daysLeft} วัน`;

      return {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${urgencyText}`,
              weight: 'bold',
              size: 'lg',
              color: '#000000ff'
            }
          ],
          backgroundColor: urgencyColor,
          paddingAll: '15px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: task.task_name,
              weight: 'bold',
              size: 'md',
              wrap: true,
              color: '#1F2937'
            },
            {
              type: 'box',
              layout: 'baseline',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: task.project?.project_name || 'ไม่ระบุโปรเจกต์',
                  size: 'sm',
                  color: '#6B7280',
                  wrap: true,
                  margin: 'sm'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'เดดไลน์:',
                      size: 'sm',
                      color: '#6B7280',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: deadlineDate.toLocaleDateString('th-TH', { 
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric' 
                      }),
                      size: 'sm',
                      color: '#374151',
                      align: 'end',
                      weight: 'bold'
                    }
                  ]
                },
                ...(task.assigned_user ? [{
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'ผู้รับผิดชอบ:',
                      size: 'sm',
                      color: '#6B7280',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: task.assigned_user.display_name,
                      size: 'sm',
                      color: '#374151',
                      align: 'end'
                    }
                  ]
                }] : [])
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียด',
                uri: `${liffUrl}/projectdetail/${task.project?.project_id || ''}`
              },
              color: urgencyColor,
              height: 'sm'
            }
          ]
        }
      };
    });

    // สร้าง carousel message
    const flexMessage = {
      type: 'flex',
      altText: `แจ้งเตือน: มี ${tasksData.length} งานใกล้ถึงเดดไลน์`,
      contents: {
        type: 'carousel',
        contents: taskBubbles
      }
    };

    const response = await axios.post(
      LINE_MESSAGING_API,
      {
        to: lineGroupId,
        messages: [flexMessage]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('[LINE] Deadline reminder sent successfully for', tasksData.length, 'tasks');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[LINE] Error sending deadline reminder:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

/**
 * ส่ง Flex Message แสดงความยินดีเมื่อโปรเจกต์เสร็จสมบูรณ์
 */
async function sendProjectCompletedMessage(lineGroupId, projectData) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }

    const liffUrl = process.env.LIFF_URL || 'https://liff.line.me/2008277186-xq681oX3';
    const projectUrl = `${liffUrl}/projectdetail/${projectData.project_id}`;

    console.log('[LINE] Sending project completion message to group:', lineGroupId);

    const flexMessage = {
      type: 'flex',
      altText: `ยินดีด้วย! โปรเจกต์ "${projectData.project_name}" เสร็จสมบูรณ์แล้ว!`,
      contents: {
        type: 'bubble',
        size: 'giga',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ยินดีด้วย!',
              weight: 'bold',
              size: 'xxl',
              align: 'center',
              color: '#000000ff',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'โปรเจกต์สำเร็จ',
              size: 'md',
              align: 'center',
              color: '#000000ff',
              margin: 'sm'
            }
          ],
          backgroundColor: '#f8a720',
          paddingAll: '30px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: projectData.project_name,
              weight: 'bold',
              size: 'xl',
              wrap: true,
              align: 'center',
              color: '#f8a720'
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'xl',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'งานทั้งหมดเสร็จสมบูรณ์',
                      size: 'md',
                      color: '#555555',
                      flex: 1,
                      margin: 'md'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: `รวม ${projectData.total_tasks} งาน`,
                      size: 'md',
                      color: '#555555',
                      flex: 1,
                      margin: 'md'
                    }
                  ],
                  margin: 'md'
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'สถานะ: บรรลุเป้าหมาย',
                      size: 'md',
                      color: '#f8a720',
                      weight: 'bold',
                      flex: 1,
                      margin: 'md'
                    }
                  ],
                  margin: 'md'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'ขอแสดงความยินดีกับทุกคนที่ร่วมงานกันค่ะ!',
                  wrap: true,
                  color: '#8B8B8B',
                  size: 'sm',
                  align: 'center'
                }
              ],
              margin: 'xl',
              paddingAll: '10px',
              backgroundColor: '#F7F7F7',
              cornerRadius: '10px'
            }
          ],
          paddingAll: '20px'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดโปรเจกต์',
                uri: projectUrl
              },
              color: '#f8a720'
            }
          ],
          flex: 0
        }
      }
    };

    const response = await axios.post(
      LINE_MESSAGING_API,
      {
        to: lineGroupId,
        messages: [flexMessage]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('[LINE] ✅ Project completion message sent successfully');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[LINE] Error sending project completion message:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

/**
 * ดึงข้อมูลโปรไฟล์ทั้งหมดของสมาชิกในกลุ่ม LINE
 * @param {string} lineGroupId - LINE Group ID
 * @returns {Promise<{success: boolean, data?: array, error?: string}>}
 */
async function getAllGroupMemberProfiles(lineGroupId) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }

    // ขั้นที่ 1: ดึงรายชื่อ User IDs ทั้งหมด
    const memberIdsResult = await getGroupMemberIds(lineGroupId);
    if (!memberIdsResult.success || !memberIdsResult.data || memberIdsResult.data.length === 0) {
      return { 
        success: false, 
        error: memberIdsResult.error || 'No members found in group' 
      };
    }

    const memberIds = memberIdsResult.data;
    console.log(`[LINE] Fetching profiles for ${memberIds.length} members...`);

    // ขั้นที่ 2: ดึงโปรไฟล์ของแต่ละคน (พร้อมกัน)
    const profilePromises = memberIds.map(userId =>
      getGroupMemberProfile(lineGroupId, userId)
    );

    const profiles = await Promise.all(profilePromises);

    // ขั้นที่ 3: ประมวลผลผลลัพธ์
    const successProfiles = profiles
      .filter(result => result.success)
      .map(result => result.data);

    const failedProfiles = profiles.filter(result => !result.success);

    console.log(`[LINE] Successfully retrieved ${successProfiles.length}/${memberIds.length} member profiles`);
    
    if (failedProfiles.length > 0) {
      console.warn(`[LINE] Failed to retrieve ${failedProfiles.length} profiles`);
    }

    return {
      success: true,
      data: successProfiles,
      total: memberIds.length,
      retrieved: successProfiles.length,
      failed: failedProfiles.length
    };
  } catch (error) {
    console.error('[LINE] Error getting all group member profiles:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * ซิงค์สมาชิก LINE เข้าฐานข้อมูล (จาก LINE API เข้า Supabase)
 * @param {number} groupId - Group ID ในฐานข้อมูล
 * @param {string} lineGroupId - LINE Group ID
 * @returns {Promise<{success: boolean, synced?: number, error?: string}>}
 */
async function syncLineGroupMembers(groupId, lineGroupId) {
  try {
    console.log(`[LINE] Starting sync for group ${groupId} (LINE: ${lineGroupId})`);

    // ขั้นที่ 1: ดึงสมาชิกจาก LINE API
    const profilesResult = await getAllGroupMemberProfiles(lineGroupId);
    if (!profilesResult.success || !profilesResult.data) {
      return { 
        success: false, 
        error: profilesResult.error || 'Failed to fetch LINE members' 
      };
    }

    const lineProfiles = profilesResult.data;
    console.log(`[LINE] Got ${lineProfiles.length} profiles from LINE API`);

    // ขั้นที่ 2: ซิงค์กับ Database
    const supabase = require('../config/supabase');
    let syncedCount = 0;
    const errors = [];

    for (const profile of lineProfiles) {
      try {
        // หรือหา user โดยใช้ line_user_id
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', profile.userId)
          .maybeSingle();

        if (checkError) {
          console.warn(`[LINE] Error checking user ${profile.userId}:`, checkError.message);
          errors.push(`User check failed for ${profile.displayName}`);
          continue;
        }

        let userId;

        if (existingUser) {
          // User มีอยู่แล้ว ปรับปรุง display_name และ picture_url
          userId = existingUser.user_id;
          const { error: updateError } = await supabase
            .from('users')
            .update({
              display_name: profile.displayName,
              picture_url: profile.pictureUrl || null,
              status_message: profile.statusMessage || null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.warn(`[LINE] Error updating user ${userId}:`, updateError.message);
            errors.push(`User update failed for ${profile.displayName}`);
            continue;
          }
          console.log(`[LINE] Updated user ${userId}: ${profile.displayName}`);
        } else {
          // User ใหม่ สร้างเข้า Database
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              line_user_id: profile.userId,
              display_name: profile.displayName,
              picture_url: profile.pictureUrl || null,
              status_message: profile.statusMessage || null
            }])
            .select('user_id');

          if (createError) {
            console.warn(`[LINE] Error creating user ${profile.userId}:`, createError.message);
            errors.push(`User creation failed for ${profile.displayName}`);
            continue;
          }

          userId = newUser[0].user_id;
          console.log(`[LINE] Created new user ${userId}: ${profile.displayName}`);
        }

        // เพิ่มสมาชิกเข้ากลุ่ม (ถ้ายังไม่เป็นสมาชิก)
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .maybeSingle();

        if (memberCheckError) {
          console.warn(`[LINE] Error checking member:`, memberCheckError.message);
          errors.push(`Member check failed for ${profile.displayName}`);
          continue;
        }

        if (!existingMember) {
          const { error: addError } = await supabase
            .from('group_members')
            .insert([{
              group_id: groupId,
              user_id: userId,
              role: 'member',
              joined_at: new Date().toISOString()
            }]);

          if (addError) {
            console.warn(`[LINE] Error adding member:`, addError.message);
            errors.push(`Member add failed for ${profile.displayName}`);
            continue;
          }
          console.log(`[LINE] Added ${profile.displayName} to group ${groupId}`);
        } else {
          console.log(`[LINE] ${profile.displayName} already in group ${groupId}`);
        }

        syncedCount++;
      } catch (err) {
        console.error(`[LINE] Unexpected error syncing ${profile.displayName}:`, err);
        errors.push(`Unexpected error for ${profile.displayName}`);
      }
    }

    console.log(`[LINE] Sync completed: ${syncedCount}/${lineProfiles.length} members synced`);
    if (errors.length > 0) {
      console.warn(`[LINE] Errors during sync:`, errors);
    }

    return {
      success: true,
      synced: syncedCount,
      total: lineProfiles.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('[LINE] Error syncing members:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * ส่ง Flex Message แจ้งเตือนเมื่อมีคนเริ่ม work session
 */
async function sendWorkspaceInviteMessage(lineGroupId, sessionData) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }

    const { user, task, project } = sessionData;
    
    const liffUrl = process.env.LIFF_URL || 'https://liff.line.me/2008277186-xq681oX3';
    const workspaceUrl = `${liffUrl}/workspace?groupId=${project.group_id}`;

    const flexMessage = {
      type: 'flex',
      altText: `${user.display_name || 'สมาชิก'} เริ่มทำงานใน Workspace แล้ว!`,
      contents: {
        type: 'bubble',
        size: 'mega',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'Workspace',
                  color: '#ffffff',
                  size: 'xl',
                  weight: 'bold',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: 'มาทำงานด้วยกัน!',
                  color: '#ffffff',
                  size: 'sm',
                  align: 'center',
                  margin: 'sm'
                }
              ]
            }
          ],
          paddingAll: '20px',
          backgroundColor: '#FFA500',
          spacing: 'md',
          height: '120px',
          justifyContent: 'center'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'image',
                      url: user.picture_url || 'https://via.placeholder.com/100',
                      aspectMode: 'cover',
                      size: 'full'
                    }
                  ],
                  cornerRadius: '100px',
                  width: '60px',
                  height: '60px'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: user.display_name || 'สมาชิก',
                      weight: 'bold',
                      size: 'lg',
                      wrap: true
                    },
                    {
                      type: 'text',
                      text: 'เริ่มทำงานแล้ว',
                      size: 'sm',
                      color: '#999999',
                      margin: 'sm'
                    }
                  ],
                  margin: 'lg'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: task.task_name || 'Untitled Task',
                      size: 'sm',
                      color: '#111111',
                      wrap: true,
                      margin: 'sm'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: project.project_name || 'Project',
                      size: 'sm',
                      color: '#555555',
                      wrap: true,
                      margin: 'sm'
                    }
                  ],
                  margin: 'sm'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: 'มาร่วมทำงานกันใน Workspace',
                      size: 'md',
                      color: '#FFA500',
                      weight: 'bold',
                      align: 'center',
                      wrap: true
                    }
                  ],
                  margin: 'xl',
                  paddingAll: '12px',
                  backgroundColor: '#FFF8E1',
                  cornerRadius: '8px'
                }
              ]
            }
          ],
          paddingAll: '20px'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'เข้า Workspace',
                uri: workspaceUrl
              },
              style: 'primary',
              color: '#FFA500',
              height: 'sm'
            }
          ],
          paddingAll: '20px'
        }
      }
    };

    const response = await axios.post(
      LINE_MESSAGING_API,
      {
        to: lineGroupId,
        messages: [flexMessage]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('[LINE] Workspace invite sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[LINE] Error sending workspace invite:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

module.exports = {
  sendProjectCreatedMessage,
  sendTaskStatusUpdateMessage,
  sendDeadlineReminder,
  sendProjectCompletedMessage,
  sendWorkspaceInviteMessage,
  // getGroupMemberIds,
  // getGroupMemberProfile,
  getAllGroupMemberProfiles,
  syncLineGroupMembers
};
