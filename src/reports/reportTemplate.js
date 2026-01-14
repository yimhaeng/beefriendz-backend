function getProjectReportHTML(data) {
  const { project, members, tasks, logs } = data;

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

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>Project Report</title>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      font-size: 12px;
      line-height: 1.6;
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

    h3 {
      font-size: 12px;
      margin: 10px 0 5px 0;
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
      font-size: 16px;
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
    <h1>Project Report</h1>
    <div class="project-title">${escapeHtml(project?.project_name || 'Untitled Project')}</div>
    <div class="project-meta">Created by: ${escapeHtml(project?.created_by_user?.display_name || 'Unknown')}</div>
    <div class="project-meta">Date: ${project?.created_at ? new Date(project.created_at).toLocaleDateString('th-TH') : 'N/A'}</div>
  </div>

  ${project?.description ? `
  <div class="section">
    <h2>Description</h2>
    <p style="font-size: 11px; line-height: 1.5;">${escapeHtml(project.description)}</p>
  </div>
  ` : ''}

  ${members && members.length > 0 ? `
  <div class="section">
    <h2>Team Members</h2>
    <ul>
      ${members.map(m => `<li>${escapeHtml(m.users?.display_name || 'Unknown')} (${escapeHtml(m.role || 'member')})</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${tasks && tasks.length > 0 ? `
  <div class="section">
    <h2>Tasks</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Task Name</th>
          <th style="width: 20%;">Status</th>
          <th style="width: 30%;">Assigned To</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(t => `
          <tr>
            <td>${escapeHtml(t.task_name || 'Untitled')}</td>
            <td>${escapeHtml(t.status || 'pending')}</td>
            <td>${escapeHtml(t.assigned_user?.display_name || 'Unassigned')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${logs && logs.length > 0 ? `
  <div class="section">
    <h2>Activity Logs</h2>
    ${logs.slice(0, 50).map(log => `
      <div class="log-entry">
        <div class="log-user">${escapeHtml(log.users?.display_name || 'Unknown User')}</div>
        <div class="log-action">${escapeHtml(log.action || 'Updated')}</div>
        <div class="log-time">${log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : 'N/A'}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString('th-TH')} at ${new Date().toLocaleTimeString('th-TH')}</p>
  </div>

</body>
</html>
  `;
}

module.exports = {
  getProjectReportHTML
};
  </div>

</body>
</html>
`;
}

module.exports = {
  getProjectReportHTML
};
