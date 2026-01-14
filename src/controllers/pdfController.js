const supabase = require('../config/supabase');
import { reportHTML } from '../pdf/reportTemplate.js';
import { generatePDF } from '../pdf/generatePdf.js';

// 🔹 import model / db connection ของคุณ

export async function exportProjectReport(req, res) {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    // 1️⃣ ดึงข้อมูลโปรเจกต์
    const project = await supabase('projects')
      .where('project_id', projectId)
      .first();

    // 2️⃣ ดึง task + phase + assigned user
    const tasks = await supabase('tasks')
      .leftJoin('users', 'tasks.assigned_to', 'users.user_id')
      .select(
        'tasks.task_name',
        'tasks.status',
        'tasks.phase_name',
        'users.display_name as assigned_user'
      )
      .where('tasks.project_id', projectId);

    // 3️⃣ ดึง activity logs
    const activityLogs = await supabase('activity_logs')
      .leftJoin('users', 'activity_logs.user_id', 'users.user_id')
      .select(
        'users.display_name as user_name',
        'activity_logs.old_value',
        'activity_logs.new_value',
        'activity_logs.created_at'
      )
      .where('activity_logs.project_id', projectId)
      .orderBy('activity_logs.created_at', 'desc');

    // 4️⃣ คำนวณ participation
    const participationMap = {};
    tasks.forEach(t => {
      if (!participationMap[t.assigned_user]) {
        participationMap[t.assigned_user] = 0;
      }
      participationMap[t.assigned_user]++;
    });

    const participationData = Object.entries(participationMap).map(
      ([userName, taskCount]) => ({
        userName,
        taskCount,
      })
    );

    // 5️⃣ นับ progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      t => t.status === 'completed'
    ).length;

    // 6️⃣ เตรียม data สำหรับ reportTemplate
    const reportData = {
      projectName: project.project_name,
      groupName: project.group_name,
      totalTasks,
      completedTasks,
      participationData,
      tasks: tasks.map(t => ({
        task_name: t.task_name,
        status: t.status,
        phase_name: t.phase_name,
        assigned_user: {
          display_name: t.assigned_user,
        },
      })),
      activityLogs,
    };

    // 7️⃣ สร้าง PDF
    const html = reportHTML(reportData);
    const pdfBuffer = await generatePDF(html);

    // 8️⃣ ส่ง PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=project_${projectId}_report.pdf`
    );
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
}
