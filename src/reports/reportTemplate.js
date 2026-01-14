function getProjectReportHTML(data) {
  const { project, members, tasks, logs } = data;

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>Project Report</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      margin: 40px;
      color: #000;
    }

    h1 {
      text-align: center;
      margin-bottom: 10px;
    }

    h2 {
      margin-top: 40px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
    }

    .section {
      margin-top: 20px;
    }

    .log {
      font-size: 10px;
      padding: 6px;
      margin-bottom: 6px;
      background: #f5f5f5;
      border-left: 3px solid #000;
      page-break-inside: avoid;
    }
  </style>
</head>

<body>

  <h1>Project Report</h1>
  <p style="text-align:center;">
    <strong>${project.project_name}</strong><br/>
    Created by ${project.created_by_user?.display_name || '-'}
  </p>

  <div class="section">
    <h2>Members</h2>
    <ul>
      ${members.map(m => `
        <li>${m.users.display_name} (${m.role})</li>
      `).join('')}
    </ul>
  </div>

  <div class="section">
    <h2>Tasks</h2>
    <ul>
      ${tasks.map(t => `
        <li>${t.task_name} — ${t.status}</li>
      `).join('')}
    </ul>
  </div>

  <div class="section">
    <h2>Activity Logs</h2>
    ${logs.map(log => `
      <div class="log">
        <strong>${log.users.display_name}</strong><br/>
        ${log.action}<br/>
        <small>${new Date(log.created_at).toLocaleString('th-TH')}</small>
      </div>
    `).join('')}
  </div>

</body>
</html>
`;
}

module.exports = {
  getProjectReportHTML
};
