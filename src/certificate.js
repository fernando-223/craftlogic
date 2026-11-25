const PDFDocument = require('pdfkit');
const path = require('node:path');
const pool = require('./database');
const { modules } = require('../public/expeditions');

const TEMPLATE = path.join(__dirname, '../public/valle-media/certificate-template.png');
const CALENDAR = path.join(__dirname, '../public/valle-media/certificate-calendar.png');
const TEAL = '#0b3940';
const CREAM = '#fbefd7';

module.exports = async function certificate(req, res, next) {
  try {
    const ids = modules.map(module => module.id);
    const [rows] = await pool.query(
      "SELECT u.name, MAX(p.completed_at) AS finished FROM users u JOIN progress p ON u.id=p.user_id WHERE u.id=? AND u.role='student' AND p.module_id IN (?) AND p.completed_at IS NOT NULL GROUP BY u.id,u.name HAVING COUNT(DISTINCT p.module_id)=?",
      [req.user.id, ids, ids.length]
    );
    if (!rows.length) {
      return res.status(403).json({ error: 'Completa todas las expediciones para obtener tu certificado.' });
    }

    const { name, finished } = rows[0];
    const safeName = String(name).normalize('NFC').replace(/[\x00-\x1f]/g, ' ').trim();
    const date = new Intl.DateTimeFormat('es-PA', {
      dateStyle: 'long',
      timeZone: 'America/Panama'
    }).format(finished);
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0,
      info: { Title: 'Certificado de culminación CraftLogic' }
    });

    res.set('Cache-Control', 'private, no-store').attachment('Certificado-CraftLogic.pdf');
    doc.pipe(res);
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const scaleX = pageWidth / 1536;
    const scaleY = pageHeight / 1024;

    // La plantilla conserva el diseño proporcionado; estos dos campos son dinámicos.
    doc.image(TEMPLATE, 0, 0, { width: pageWidth, height: pageHeight });

    const nameWidth = 1060 * scaleX;
    let nameSize = 30;
    doc.font('Times-Bold');
    while (nameSize > 12 && doc.fontSize(nameSize).widthOfString(safeName) > nameWidth) {
      nameSize -= 1;
    }
    doc.fillColor(TEAL).fontSize(nameSize).text(safeName, 0, 420 * scaleY, {
      width: pageWidth,
      align: 'center',
      lineBreak: false
    });

    const pillX = 372 * scaleX;
    const pillY = 614 * scaleY;
    const pillWidth = 792 * scaleX;
    const pillHeight = 68 * scaleY;
    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2 - 1).fill(CREAM);
    doc.image(CALENDAR, 404 * scaleX, 620 * scaleY, {
      width: 56 * scaleX,
      height: 56 * scaleY
    });

    const dateText = `Fecha de culminación: ${date}`;
    const fieldX = 470 * scaleX;
    const fieldY = 620 * scaleY;
    const fieldWidth = 676 * scaleX;
    let dateSize = 17;
    doc.font('Times-Roman');
    while (dateSize > 12 && doc.fontSize(dateSize).widthOfString(dateText) > fieldWidth - 12) {
      dateSize -= 0.5;
    }
    doc.fillColor(TEAL).fontSize(dateSize).text(dateText, fieldX, fieldY + 8 * scaleY, {
      width: fieldWidth,
      align: 'center',
      lineBreak: false
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};