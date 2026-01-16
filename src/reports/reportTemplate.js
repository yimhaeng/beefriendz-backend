function getProjectReportHTML(data) {
  const { project, members, tasks, logs, participationData } = data;

  // Pre-compute summary data
  const totalTasks = tasks?.length || 0;
  const statusCounts = {
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress' || t.status === 'in-progress').length || 0,
    submitted: tasks?.filter(t => t.status === 'submitted').length || 0,
    reviewing: tasks?.filter(t => t.status === 'reviewing').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
  };

  const phaseBuckets = (() => {
    const bucket = {};
    (tasks || []).forEach(t => {
      const phase = t.phase_name || 'No Phase';
      if (!bucket[phase]) bucket[phase] = [];
      bucket[phase].push(t);
    });
    return bucket;
  })();

  // Helper function to escape HTML
  const escapeHtml = (text) => {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  };

  // Thai localization
  const thaiStatus = (status) => {
    const map = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังทำ',
      'in-progress': 'กำลังทำ',
      submitted: 'ส่งงานแล้ว',
      reviewing: 'รออนุมัติ',
      completed: 'เสร็จสิ้น',
    };
    return map[status] || status;
  };

  const thaiLabels = {
    projectDetails: 'รายละเอียดโปรเจกต์',
    projectId: 'ID โปรเจกต์',
    groupId: 'ID กลุ่ม',
    createdAt: 'วันที่สร้าง',
    description: 'คำอธิบาย',
    teamMembers: 'สมาชิกทีม',
    role: 'บทบาท',
    taskStatusSummary: 'สรุปสถานะงาน',
    status: 'สถานะ',
    count: 'จำนวน',
    percent: 'เปอร์เซ็นต์',
    totalTasks: 'งานทั้งหมด',
    taskName: 'ชื่องาน',
    assignedTo: 'มอบให้',
    tasksByPhase: 'งานตามระยะ',
    activityLogs: 'บันทึกกิจกรรม',
    user: 'ผู้ใช้',
    action: 'การกระทำ',
    time: 'เวลา',
    generatedOn: 'สร้างเมื่อ',
    noDescription: 'ไม่มีคำอธิบาย',
    noPhase: 'ไม่มีระยะ',
    unassigned: 'ยังไม่มีผู้รับผิดชอบ',
  };

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Report</title>
  
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Thai', 'Tahoma', 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.8;
      padding: 20px;
      color: #000;
      background: white;
    }

    h1 {
      text-align: center;
      margin: 20px 0;
      font-size: 20px;
    }

    h2 {
      margin: 20px 0 10px 0;
      font-size: 14px;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .header-info {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #ccc;
    }

    .project-title {
      font-size: 18px;
      font-weight: bold;
      margin: 10px 0;
    }

    .project-meta {
      font-size: 11px;
      color: #666;
      margin: 5px 0;
    }

    ul {
      margin-left: 20px;
    }

    li {
      margin: 5px 0;
      font-size: 11px;
    }

    .log-entry {
      font-size: 10px;
      margin: 8px 0;
      padding: 8px;
      background: #f9f9f9;
      border-left: 3px solid #333;
      page-break-inside: avoid;
    }

    .log-user {
      font-weight: bold;
      margin-bottom: 3px;
    }

    .log-action {
      margin: 3px 0;
      color: #444;
    }

    .log-time {
      font-size: 9px;
      color: #999;
      margin-top: 3px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 11px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #999;
    }
  </style>
</head>

<body>

  <div class="header-info">
    <h1>รายงานโปรเจกต์</h1>
    <div class="project-title">${escapeHtml(project?.project_name || 'โปรเจกต์ไม่มีชื่อ')}</div>
    <div class="project-meta">สร้างโดย: ${escapeHtml(project?.created_by_user?.display_name || 'ไม่ทราบ')}</div>
    <div class="project-meta">วันที่: ${project?.created_at ? new Date(project.created_at).toLocaleDateString('th-TH') : 'ไม่ทราบ'}</div>
  </div>

  <div class="section" style="page-break-inside: avoid;">
    <h2>${thaiLabels.projectDetails}</h2>
    <p style="font-size: 11px; line-height: 1.5;">${escapeHtml(project.description)}</p>
  </div>

  ${members && members.length > 0 ? `
  <div class="section">
    <h2>${thaiLabels.teamMembers}</h2>
    <ul>
      ${members.map(m => `<li>${escapeHtml(m.users?.display_name || 'ไม่ทราบ')} (${escapeHtml(m.role || 'สมาชิก')})</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${participationData?.length ? `
  <div class="section">
    <h2>Team Participation</h2>
    ${participationData.map((member, idx) => `
      <p style="font-size: 11px; margin: 5px 0;">
        ${idx + 1}. ${escapeHtml(member.userName)}: ${member.taskCount} tasks
      </p>
    `).join('')}
  </div>
  ` : ''}

  <div class="section" style="page-break-inside: avoid;">
    <h2>${thaiLabels.taskStatusSummary}</h2>
    <table>
      <thead>
        <tr>
          <th>${thaiLabels.status}</th>
          <th>${thaiLabels.count}</th>
          <th>${thaiLabels.percent}</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(statusCounts).map(([status, count]) => {
          const percent = totalTasks ? Math.round((count / totalTasks) * 100) : 0;
          return `<tr><td>${thaiStatus(status)}</td><td>${count}</td><td>${percent}%</td></tr>`;
        }).join('')}
      </tbody>
    </table>
    <p style="font-size: 11px; margin-top: 6px;">${thaiLabels.totalTasks}: ${totalTasks}</p>
  </div>

  ${tasks && tasks.length > 0 ? `
  <div class="section">
    <h2>${thaiLabels.taskName}</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 50%;">${thaiLabels.taskName}</th>
          <th style="width: 20%;">${thaiLabels.status}</th>
          <th style="width: 30%;">${thaiLabels.assignedTo}</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(t => `
          <tr>
            <td>${escapeHtml(t.task_name || 'ไม่มีชื่อ')}</td>
            <td>${thaiStatus(t.status || 'pending')}</td>
            <td>${escapeHtml(t.assigned_user?.display_name || thaiLabels.unassigned)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${Object.keys(phaseBuckets).length ? `
  <div class="section">
    <h2>${thaiLabels.tasksByPhase}</h2>
    ${Object.entries(phaseBuckets).map(([phase, phaseTasks]) => `
      <h3 style="margin: 10px 0 6px 0;">${escapeHtml(phase)} (${phaseTasks.length})</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 45%;">${thaiLabels.taskName}</th>
            <th style="width: 20%;">${thaiLabels.status}</th>
            <th style="width: 35%;">${thaiLabels.assignedTo}</th>
          </tr>
        </thead>
        <tbody>
          ${phaseTasks.map(t => `
            <tr>
              <td>${escapeHtml(t.task_name || 'ไม่มีชื่อ')}</td>
              <td>${thaiStatus(t.status || 'pending')}</td>
              <td>${escapeHtml(t.assigned_user?.display_name || thaiLabels.unassigned)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')}
  </div>
  ` : ''}

  ${logs && logs.length > 0 ? `
  <div class="section">
    <h2>${thaiLabels.activityLogs}</h2>
    ${logs.map(log => `
      <div class="log-entry">
        <div class="log-user">${escapeHtml(log.users?.display_name || 'ผู้ใช้ไม่ทราบ')}</div>
        <div class="log-action">${escapeHtml(log.action || 'อัปเดต')}</div>
        <div class="log-time">${log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : 'ไม่ทราบ'}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}


  <div class="footer">
    <p>${thaiLabels.generatedOn} ${new Date().toLocaleDateString('th-TH')} เวลา ${new Date().toLocaleTimeString('th-TH')}</p>
  </div>

</body>
</html>
  `;
}

module.exports = {
  getProjectReportHTML
};
