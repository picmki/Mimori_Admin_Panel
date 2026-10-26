import fs from 'node:fs';
import path from 'node:path';

function buildPDF() {
  const content = [
    'BT',
    '/F1 24 Tf',
    '0.89 0.11 0.11 rg',
    '50 780 Td',
    '(MIMORI DIGITAL) Tj',
    '0 0 0 rg',
    '/F1 15 Tf',
    '0 -24 Td',
    '(2026 EXPERIENTIAL PHOTOBOOTH & EVENT LOOKBOOK) Tj',
    '/F2 10 Tf',
    '0.4 0.45 0.5 rg',
    '0 -16 Td',
    '(High-Fashion Editorial Imaging, 360 Video Rigs & Technical Rider) Tj',
    '0.85 0.88 0.92 RG',
    '1 w',
    '50 720 m 545 720 l S',
    '0 0 0 rg',
    '/F1 12 Tf',
    '50 690 Td',
    '(1. FLEET EXPERIENCES OVERVIEW) Tj',
    '/F2 9.5 Tf',
    '0.2 0.25 0.3 rg',
    '0 -18 Td',
    '(- The B&W Kardashian Glam Booth: Canon 45MP EOS R5, skin-smoothing algorithm, 7s lab metallic prints.) Tj',
    '0 -15 Td',
    '(- The Signature Studio Photobooth: Open-air portrait studio, 500W studio beauty dish strobe.) Tj',
    '0 -15 Td',
    '(- 360 Cinematic Video Rig: High-speed robotic arm, 4K 120fps slow-motion, glass RGB floor.) Tj',
    '0 -15 Td',
    '(- Vintage Audio Guestbook: Authentically restored 1940s Western Electric rotary telephones.) Tj',
    '0 -15 Td',
    '(- Corporate Brand Activation Kiosk: Live digital photo mosaic, opt-in GDPR CRM data capture.) Tj',
    '0 -15 Td',
    '(- Custom Immersive & Generative AI Set: Bespoke set fabrication, custom neon, real-time AI realms.) Tj',
    '0.85 0.88 0.92 RG',
    '50 560 m 545 560 l S',
    '0 0 0 rg',
    '/F1 12 Tf',
    '50 535 Td',
    '(2. TECHNICAL SPATIAL RIDERS & VENUE REQUIREMENTS) Tj',
    '/F2 9.5 Tf',
    '0.2 0.25 0.3 rg',
    '0 -18 Td',
    '(Spatial Footprint: 2.6m x 2.6m clear floor area; 2.4m minimum ceiling height.) Tj',
    '0 -15 Td',
    '(Electrical Draw: Single standard 230V / 13A UK plug or 110V 15A US socket (< 600W peak draw).) Tj',
    '0 -15 Td',
    '(Load-In Window: Silent 90-minute calibration prior to event doors opening.) Tj',
    '0 -15 Td',
    '(Backdrop Standards: Pure white tension, matte black, bespoke printed floral or custom neon.) Tj',
    '0.85 0.88 0.92 RG',
    '50 420 m 545 420 l S',
    '0 0 0 rg',
    '/F1 12 Tf',
    '50 395 Td',
    '(3. CURATED INVESTMENT TIERS) Tj',
    '/F2 9.5 Tf',
    '0.2 0.25 0.3 rg',
    '0 -18 Td',
    '(Classic Tier: 3 Hours active operation, unlimited prints, custom monogram design, 2 concierges.) Tj',
    '0 -15 Td',
    '(VIP Gold Tier: 4 Hours active operation, leather guestbook album, acrylic frames, raw download reel.) Tj',
    '0 -15 Td',
    '(Platinum Gala: Full evening (up to 6 hours), bespoke neon signage, production supervisor on site.) Tj',
    '0.85 0.88 0.92 RG',
    '50 295 m 545 295 l S',
    '0 0 0 rg',
    '/F1 12 Tf',
    '50 270 Td',
    '(4. GLOBAL CONCIERGE & DIRECT COMMISSIONS) Tj',
    '/F2 9.5 Tf',
    '0.2 0.25 0.3 rg',
    '0 -18 Td',
    '(Direct Event Director Hotline: +91 67869 81769) Tj',
    '0 -15 Td',
    '(Concierge Email: concierge@mimoridigital.com) Tj',
    '0 -15 Td',
    '(Offices: London * Paris * Dubai * Mumbai * Bangalore) Tj',
    '0 -15 Td',
    '(Web: https://mimoridigital.com | Look. Book. Enjoy.) Tj',
    'ET'
  ].join('\n');

  const streamLen = Buffer.byteLength(content, 'latin1');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj(`6 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj`);

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n';
  pdf += '0 7\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < 6; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n';
  pdf += '<< /Size 7 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += xrefOffset + '\n';
  pdf += '%%EOF\n';

  return pdf;
}

const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const pdfData = buildPDF();
const dest = path.join(downloadsDir, 'Mimori_Digital_Lookbook_2026.pdf');
fs.writeFileSync(dest, pdfData, 'latin1');
console.log('SUCCESS: Written brochure PDF to ' + dest);
