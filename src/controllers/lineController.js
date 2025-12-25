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
      const urgencyEmoji = daysLeft <= 1 ? '🔴' : daysLeft <= 2 ? '🟡' : '🟢';
      const urgencyText = daysLeft <= 0 ? 'เลยเดดไลน์!' : daysLeft === 1 ? 'พรุ่งนี้!' : `อีก ${daysLeft} วัน`;

      return {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${urgencyEmoji} ${urgencyText}`,
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF'
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
                  text: '📋',
                  size: 'sm',
                  flex: 0
                },
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
                      text: '📅 เดดไลน์:',
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
                      text: '👤 ผู้รับผิดชอบ:',
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
                label: '📋 ดูรายละเอียด',
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
      altText: `⏰ แจ้งเตือน: มี ${tasksData.length} งานใกล้ถึงเดดไลน์`,
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
      altText: `🎊 ยินดีด้วย! โปรเจกต์ "${projectData.project_name}" เสร็จสมบูรณ์แล้ว!`,
      contents: {
        type: 'bubble',
        size: 'giga',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎊',
              size: '5xl',
              align: 'center',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'ยินดีด้วย!',
              weight: 'bold',
              size: 'xxl',
              align: 'center',
              color: '#FFFFFF',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'โปรเจกต์สำเร็จ',
              size: 'md',
              align: 'center',
              color: '#FFFFFF',
              margin: 'sm'
            }
          ],
          backgroundColor: '#17C964',
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
              color: '#17C964'
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
                      text: '✅',
                      size: 'xl',
                      flex: 0
                    },
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
                      text: '📊',
                      size: 'xl',
                      flex: 0
                    },
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
                      text: '🏆',
                      size: 'xl',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: 'สถานะ: บรรลุเป้าหมาย',
                      size: 'md',
                      color: '#17C964',
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
                  text: '🎉 ขอแสดงความยินดีกับทุกคนที่ร่วมงานกันค่ะ!',
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
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดโปรเจกต์',
                uri: projectUrl
              },
              color: '#17C964'
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

module.exports = {
  sendProjectCreatedMessage,
  sendTaskStatusUpdateMessage,
  sendDeadlineReminder,
  sendProjectCompletedMessage
};
