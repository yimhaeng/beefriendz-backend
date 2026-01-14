// src/controllers/reportController.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { getProjectReportHTML } = require('../reports/reportTemplate');
const { getProjectReportData } = require('./reportDataService');

exports.exportProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    const data = await getProjectReportData(projectId);
    const html = getProjectReportHTML(data);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=project-${projectId}.pdf`,
    });

    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export report' });
  }
};
