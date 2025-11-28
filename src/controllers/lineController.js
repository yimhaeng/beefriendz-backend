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
      altText: `🎉 สร้างโปรเจกต์ "${projectData.project_name}" สำเร็จ!`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎉 โปรเจกต์ใหม่!',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF'
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
              color: '#999999',
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
                      text: '📅 เริ่ม:',
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
                      text: '🏁 สิ้นสุด:',
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
              style: 'primary',
              action: {
                type: 'uri',
                label: '📋 ดูรายละเอียดโปรเจกต์',
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
      'todo': { emoji: '📝', text: 'รอดำเนินการ', color: '#999999' },
      'in_progress': { emoji: '🔄', text: 'กำลังทำ', color: '#3B82F6' },
      'reviewing': { emoji: '👀', text: 'รอตรวจสอบ', color: '#8B5CF6' },
      'submitted': { emoji: '⏳', text: 'รอหัวหน้าอนุมัติ', color: '#F59E0B' },
      'completed': { emoji: '✅', text: 'เสร็จสิ้น', color: '#10B981' }
    };

    const newStatusInfo = statusConfig[status] || { emoji: '📌', text: status, color: '#6B7280' };
    const oldStatusInfo = statusConfig[old_status] || { emoji: '📌', text: old_status, color: '#6B7280' };

    const liffUrl = process.env.LIFF_URL || 'https://liff.line.me/2008277186-xq681oX3';
    const projectUrl = `${liffUrl}/projectdetail/${project.project_id}`;

    const flexMessage = {
      type: 'flex',
      altText: `${newStatusInfo.emoji} งาน "${task_name}" เปลี่ยนเป็น ${newStatusInfo.text}`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${newStatusInfo.emoji} อัปเดตสถานะงาน`,
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF'
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
                      text: 'สถานะเดิม:',
                      size: 'sm',
                      color: '#6B7280',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: `${oldStatusInfo.emoji} ${oldStatusInfo.text}`,
                      size: 'sm',
                      color: '#9CA3AF',
                      align: 'end',
                      decoration: 'line-through'
                    }
                  ]
                },
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
                      text: `${newStatusInfo.emoji} ${newStatusInfo.text}`,
                      size: 'sm',
                      color: newStatusInfo.color,
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
              style: 'primary',
              action: {
                type: 'uri',
                label: '📋 ดูโปรเจกต์',
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

module.exports = {
  sendProjectCreatedMessage,
  sendTaskStatusUpdateMessage
};
