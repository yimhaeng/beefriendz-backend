export function reportHTML(data) {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />

<style>
  @page {
    size: A4;
    margin: 20mm 15mm;
  }

  body {
    font-family: "Sarabun", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #000;
  }

  h1 {
    text-align: center;
    margin-bottom: 4px;
  }

  h2 {
    font-size: 16px;
    margin-bottom: 8px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
  }

  .subtitle {
    text-align: center;
    font-size: 12px;
    color: #666;
    margin-bottom: 24px;
  }

  .section {
    margin-bottom: 24px;
    page-break-inside: avoid;
  }

  .progress-bar {
    width: 100%;
    height: 12px;
    background: #eee;
    border-radius: 6px;
    overflow: hidden;
    margin-top: 6px;
  }

  .progress {
    height: 100%;
    background: #000;
  }

  .member {
    font-size: 13px;
    margin-bottom: 4px;
  }

  .phase {
    margin-top: 12px;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .task {
    margin-left: 12px;
    font-size: 13px;
  }

  .log {
    font-size: 12px;
    padding: 8px;
    border-left: 3px solid #000;
    background: #f5f5f5;
    margin-bottom: 8px;
  }

  .log-time {
    font-size: 10px;
    color: #666;
  }
</style>
</head>

<body>

  <!-- Header -->
  <h1>Project Report</h1>
  <div class="subtitle">
    Project: ${escapeHTML(data.projectName)}<br/>
    Group: ${escapeHTML(data.groupName)}
  </div>

  <!-- Overall Progress -->
  <div class="section">
    <h2>Overall Progress</h2>
    <div>
      Completed ${data.completedTasks} / ${data.totalTasks} tasks
    </div>
    <div class="progress-bar">
      <div class="progress" style="width: ${
        data.totalTasks > 0
          ? Math.round((data.completedTasks / data.totalTasks) * 100)
          : 0
      }%"></div>
    </div>
  </div>

  <!-- Team Participation -->
  <div class="section">
    <h2>Team Participation</h2>
    ${data.participationData
      .map(
        (m, i) => `
        <div class="member">
          ${i + 1}. ${escapeHTML(m.userName)} — ${m.taskCount} tasks
        </div>`
      )
      .join("")}
  </div>

  <!-- Phase & Task -->
  <div class="section">
    <h2>Phase Progress & Task Status</h2>
    ${renderPhases(data.tasks)}
  </div>

  <!-- Activity Logs -->
  <div class="section">
    <h2>Activity Logs</h2>
    ${data.activityLogs
      .map(
        (log) => `
        <div class="log">
          <strong>${escapeHTML(log.user_name)}</strong><br/>
          ${escapeHTML(log.old_value)} → ${escapeHTML(log.new_value)}
          <div class="log-time">${formatDate(log.created_at)}</div>
        </div>`
      )
      .join("")}
  </div>

</body>
</html>
`;
}

function renderPhases(tasks) {
  const byPhase = {};

  tasks.forEach(t => {
    const phase = t.phase_name || 'No Phase';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(t);
  });

  return Object.entries(byPhase)
    .map(([phase, tasks]) => `
      <div class="phase">
        <strong>Phase: ${escapeHTML(phase)}</strong>
        ${tasks
          .map(
            (t, i) => `
            <div class="task">
              ${i + 1}. ${escapeHTML(t.task_name)} <br/>
              Status: ${escapeHTML(t.status)} |
              Assigned: ${escapeHTML(
                t.assigned_user?.display_name || 'Unassigned'
              )}
            </div>`
          )
          .join("")}
      </div>
    `)
    .join("");
}

function escapeHTML(text = "") {
  return text.replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
  );
}

function formatDate(date) {
  return new Date(date).toLocaleString("th-TH");
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function renderMembers(members = []) {
  if (!members.length) return '<p>-</p>';

  return `
    <ul class="list">
      ${members.map(m => `
        <li>
          ${m.users?.display_name || 'ไม่ทราบชื่อ'}
          <span class="role">(${m.role})</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderTasks(tasks = []) {
  if (!tasks.length) return '<p>-</p>';

  return `
    <table>
      <thead>
        <tr>
          <th>งาน</th>
          <th>สถานะ</th>
          <th>กำหนดส่ง</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(t => `
          <tr>
            <td>${t.task_name}</td>
            <td>${t.status}</td>
            <td>${formatDate(t.due_date)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderLogs(logs = []) {
  if (!logs.length) return '<p>-</p>';

  return `
    <div class="logs">
      ${logs.map(log => `
        <div class="log-item">
          <div class="log-meta">
            <strong>${log.users?.display_name || 'ระบบ'}</strong>
            <span>${formatDate(log.created_at)}</span>
          </div>
          <div class="log-detail">
            ${log.detail || log.action}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getProjectReportHTML(data) {
  const { project, members, tasks, logs } = data;

  return `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>Project Report</title>

<style>
  @page {
    margin: 20mm 16mm;
  }

  body {
    font-family: 'Sarabun', sans-serif;
    font-size: 14px;
    color: #333;
  }

  h1 {
    font-size: 22px;
    margin-bottom: 4px;
  }

  h2 {
    margin-top: 24px;
    font-size: 16px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
    page-break-after: avoid;
  }

  .section {
    margin-top: 16px;
    page-break-inside: avoid;
  }

  .meta {
    color: #666;
    font-size: 13px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }

  th, td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    vertical-align: top;
  }

  th {
    background: #f5f5f5;
  }

  .list {
    padding-left: 18px;
  }

  .role {
    color: #888;
    font-size: 12px;
  }

  /* ===== LOG สำคัญมาก ===== */
  .logs {
    margin-top: 8px;
  }

  .log-item {
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }

  .log-meta {
    font-size: 12px;
    color: #666;
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .log-detail {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.4;
  }
</style>
</head>

<body>

  <h1>${project.project_name}</h1>
  <div class="meta">
    สร้างโดย ${project.created_by_user?.display_name || '-'} · 
    ${formatDate(project.created_at)}
  </div>

  <div class="section">
    <h2>รายละเอียดโปรเจกต์</h2>
    <p>${project.description || '-'}</p>
  </div>

  <div class="section">
    <h2>สมาชิกในกลุ่ม</h2>
    ${renderMembers(members)}
  </div>

  <div class="section">
    <h2>งานทั้งหมด</h2>
    ${renderTasks(tasks)}
  </div>

  <div class="section">
    <h2>บันทึกการทำงาน (Activity Log)</h2>
    ${renderLogs(logs)}
  </div>

</body>
</html>
`;
}

module.exports = {
  getProjectReportHTML
};
