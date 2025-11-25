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

    const liffUrl = process.env.LIFF_URL || 'https://beefriendz-liff.vercel.app';
    const projectUrl = `${liffUrl}/projectdetail/${projectData.project_id}`;

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

module.exports = {
  sendProjectCreatedMessage
};
