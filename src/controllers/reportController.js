const puppeteer = require('puppeteer');
const { getProjectReportHTML } = require('../reports/reportTemplate');
const { getProjectReportData } = require('../services/reportDataService');

async function exportProjectReport(req, res) {
  const { projectId } = req.params;

  try {
    // 1. ดึงข้อมูลจริง
    const data = await getProjectReportData(projectId);

    // 2. สร้าง HTML
    const html = getProjectReportHTML(data);

    // 3. เปิด browser
    const browser = await puppeteer.launch({
      headless: 'new'
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // 4. สร้าง PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    // 5. ส่งไฟล์กลับ
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=project-${projectId}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error('[exportProjectReport]', err);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างรายงานได้'
    });
  }
}

module.exports = {
  exportProjectReport
};
