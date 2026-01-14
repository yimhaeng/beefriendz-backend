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
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
        },
      });

      if (!pdf || pdf.length === 0) {
        throw new Error('Failed to generate PDF: empty buffer');
      }

      // Set headers and send the PDF
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="project-report-${projectId}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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
      message: err?.message || 'Unknown error',
    });
  }
};
