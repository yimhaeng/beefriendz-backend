// src/controllers/reportController.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { getProjectReportHTML } = require('../reports/reportTemplate');
const { getProjectReportData } = require('./reportDataService');

exports.exportProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Validate projectId
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log(`Generating PDF report for project: ${projectId}`);

    const data = await getProjectReportData(projectId);
    const html = getProjectReportHTML(data);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath:
        process.env.NODE_ENV === 'production'
          ? await chromium.executablePath()
          : undefined,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      if (!pdf || pdf.length === 0) {
        throw new Error('Failed to generate PDF: empty buffer');
      }

      // Set headers and send the PDF
      res.set({
        'Content-Disposition': `attachment; filename=project-report-${projectId}.pdf`,
        'Content-Type': 'application/pdf',
      });

      console.log(`PDF generated successfully - Size: ${pdf.length} bytes`);
      res.send(pdf);
    } finally {
      await page.close();
      await browser.close();
    }
  } catch (err) {
    console.error('Report export error:', err);
    res.status(500).json({
      error: 'Failed to export report',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
