// src/controllers/reportController.js
const puppeteer = require('puppeteer');
const { getProjectReportHTML } = require('../utils/reportTemplate');

// ⚠️ สมมติว่าคุณมี function ดึงข้อมูลอยู่แล้ว
const { getProjectReportData } = require('./reportDataService');
const projectController = require('./projectController');

exports.exportProjectReport = async (req, res) => {
  const { projectId } = req.params;

  try {
    // 1. ดึงข้อมูลจริงจาก DB
    const reportData = await projectController.getProjectReportData(projectId);
    /**
     * reportData ควรมีหน้าตาประมาณ:
     * {
     *   project: { name, description, created_at },
     *   members: [],
     *   tasks: [],
     *   logs: []
     * }
     */

    // 2. สร้าง HTML
    const html = getProjectReportHTML(reportData);

    // 3. เปิด Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // 4. สร้าง PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    });

    await browser.close();

    // 5. ส่งไฟล์กลับ
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=project-${projectId}-report.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export report failed' });
  }
};
