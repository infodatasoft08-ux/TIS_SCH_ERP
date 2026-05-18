const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const storageService = require('./storageService');

handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

class PdfService {
  /**
   * Method 1: Overlay dynamic data on a base PDF design
   */
  async overlayOnPdf(templatePath, data, fieldConfig) {
    const fullPath = storageService.getFullPath(templatePath);
    const existingPdfBytes = fs.readFileSync(fullPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // fieldConfig: { fields: [ { key, x, y, size, color, type } ] }
    for (const field of fieldConfig.fields || []) {
      const value = data[field.key] || '';
      if (!value && field.type !== 'image') continue;

      // Coordinate mapping (UI 0-100% to PDF points)
      // We assume field.x and field.y are now percentages (0-100)
      const xPos = (field.x / 100) * width;
      const yTop = (field.y / 100) * height;
      const yPos = height - yTop;

      if (field.type === 'image' || field.key === 'photo') {
        try {
          const imgPath = storageService.getFullPath(value);
          if (fs.existsSync(imgPath)) {
            const imgBytes = fs.readFileSync(imgPath);
            let image;
            if (value.toLowerCase().endsWith('.png')) image = await pdfDoc.embedPng(imgBytes);
            else image = await pdfDoc.embedJpg(imgBytes);

            const imgW = (field.width / 100) * width;
            const imgH = (field.height / 100) * height;

            firstPage.drawImage(image, {
              x: xPos,
              y: yPos - imgH,
              width: imgW,
              height: imgH,
            });
          }
        } catch (err) {
          console.error(`Error embedding image for field ${field.key}:`, err.message);
        }
      } else {
        // Draw Text
        // Font size is relative to height (approx) or keep absolute
        // Let's keep it absolute for now as size 12 is standard, or scale it
        const fontSize = field.size || 12;

        firstPage.drawText(String(value), {
          x: xPos,
          y: yPos - fontSize, // Subtract size to align top of text with yPos
          size: fontSize,
          font: font,
          color: this.hexToRgb(field.color || '#000000'),
        });
      }
    }

    return await pdfDoc.save();
  }

  /**
   * Method 3: Render first page of PDF to PNG for designer preview
   */
  async renderPdfToImage(templatePath) {
    const fullPath = storageService.getFullPath(templatePath);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      // Load PDF directly in puppeteer
      await page.goto(`file://${fullPath}`, { waitUntil: 'networkidle0' });

      // Get dimensions
      const dimensions = await page.evaluate(() => {
        return {
          width: document.querySelector('embed')?.width || 800,
          height: document.querySelector('embed')?.height || 1131
        };
      });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true
      });

      return screenshot;
    } finally {
      await browser.close();
    }
  }

  /**
   * Method 2: Render HBS template to PDF via Puppeteer
   */
  async renderHbsTemplate(templatePath, data, dimensions = { width: 345, height: 570 }) {
    const html = await this.compileHbsToHtml(templatePath, data);
    console.log(`Rendering HBS to PDF. HTML Size: ${html.length} chars.`);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();

      const width = dimensions.width || 345;
      const height = dimensions.height || 570;

      await page.setViewport({
        width: width,
        height: height,
        deviceScaleFactor: 2
      });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // const pdfBuffer = await page.pdf({
      //   format: 'A4',
      //   printBackground: true,
      //   margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      // });

      await page.emulateMediaType('screen');

      const pdfBuffer = await page.pdf({
        width: `${width}px`,
        height: `${height}px`,
        printBackground: true,
        pageRanges: '1',
        preferCSSPageSize: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Helper: Compile HBS with data and return raw HTML
   */
  async compileHbsToHtml(templatePath, data) {
    const hbsContent = storageService.readFile(templatePath).toString();
    const template = handlebars.compile(hbsContent);

    // Process images to base64 for preview
    const processedData = { ...data };

    // Robust helper to fetch and convert URL to base64, or read local file to base64
    const toBase64 = async (imagePathOrUrl) => {
      if (!imagePathOrUrl) return null;
      if (imagePathOrUrl.startsWith('data:')) return imagePathOrUrl;

      try {
        if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
          const axios = require('axios');
          const response = await axios.get(imagePathOrUrl, { responseType: 'arraybuffer', timeout: 5000 });
          const contentType = response.headers['content-type'] || 'image/png';
          return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
        } else {
          // Local file path
          const fullPath = storageService.getFullPath(imagePathOrUrl);
          if (fs.existsSync(fullPath)) {
            const imageBuffer = fs.readFileSync(fullPath);
            const ext = path.extname(fullPath).toLowerCase().replace('.', '');
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          }
        }
      } catch (err) {
        console.error(`[pdfService] Error converting ${imagePathOrUrl} to base64:`, err.message);
      }
      return null;
    };

    // Convert custom background image if present
    if (processedData.background_image) {
      const bgBase64 = await toBase64(processedData.background_image);
      if (bgBase64) {
        processedData.background_image = bgBase64;
      }
    } else {
      // Auto-inject default background image if it exists in assets
      try {
        const bgPath = path.resolve(__dirname, '../assets/id_card_bg.png');
        if (fs.existsSync(bgPath)) {
          const bgBuffer = fs.readFileSync(bgPath);
          processedData.background_image = `data:image/png;base64,${bgBuffer.toString('base64')}`;
        } else {
          console.warn("Default background image NOT found at:", bgPath);
        }
      } catch (e) {
        console.error("Error injecting default background image:", e.message);
      }
    }

    // Fallback silhouette avatar used when user photo is missing, empty, or fails to load
    const FALLBACK_AVATAR = `data:image/svg+xml;base64,${Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
        <rect width="100" height="100" fill="#e2e8f0" rx="6"/>
        <circle cx="50" cy="35" r="20" fill="#94a3b8"/>
        <ellipse cx="50" cy="85" rx="32" ry="22" fill="#94a3b8"/>
      </svg>
    `).toString('base64')}`;

    // Convert photo — fall back to silhouette if missing, blank, or unreachable
    if (processedData.photo) {
      const photoBase64 = await toBase64(processedData.photo);
      processedData.photo = photoBase64 || FALLBACK_AVATAR;
    } else {
      processedData.photo = FALLBACK_AVATAR;
    }

    return template(processedData);
  }

  /**
   * Helper: Merge multiple PDF buffers into a single PDF buffer
   */
  async mergePdfs(pdfBuffers) {
    const mergedPdf = await PDFDocument.create();
    for (const pdfBytes of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  }

  /**
   * Helper: Convert Hex color to PDF-Lib RGB format
   */
  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  }
}

module.exports = new PdfService();
