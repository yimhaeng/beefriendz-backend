// src/pdf/generatePdf.js
import puppeteer from 'puppeteer';

export async function generatePDF(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  try {
    const page = await browser.newPage();

    // ตั้งขนาด viewport ให้ใกล้ A4
    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    });

    // ใส่ HTML ที่ได้จาก reportTemplate
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // สั่ง Chrome print เป็น PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
