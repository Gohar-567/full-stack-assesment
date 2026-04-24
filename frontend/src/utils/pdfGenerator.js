import { jsPDF } from 'jspdf';

// All pages: landscape Letter 792 × 612 pt
const PW = 792, PH = 612, M = 36;

const NAVY   = [16, 42, 67];
const AMBER  = [245, 158, 11];
const SAND   = [248, 246, 240];
const WHITE  = [255, 255, 255];
const TEXT   = [30, 35, 50];
const MUTED  = [110, 120, 140];
const BORDER = [210, 205, 195];

// ── Helpers ──────────────────────────────────────────────────────────────────

function lbl(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(text.toUpperCase(), x, y);
}

function val(doc, text, x, y, maxW) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT);
  doc.text(doc.splitTextToSize(text || '—', maxW || 180), x, y);
}

function sectionTitle(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(text, x, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.5);
  doc.line(x, y + 2, x + 58, y + 2);
}

function pageFooter(doc, line1, line2) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  if (line2) {
    doc.text(line1, PW / 2, PH - 19, { align: 'center' });
    doc.text(line2, PW / 2, PH - 10, { align: 'center' });
  } else {
    doc.text(line1, PW / 2, PH - 13, { align: 'center' });
  }
  doc.setFillColor(...AMBER);
  doc.rect(0, PH - 5, PW, 5, 'F');
}

/**
 * Generates and downloads a landscape-Letter PDF:
 *   Page 1  — full-page cover with driver info, route, summary
 *   Pages 2+ — one ELD log sheet PNG per day
 */
export function generateTripPDF({ driverInfo, tripData, logSheets, tripInput }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════════════════════════════════════

  // ── Top header bar (navy, 60pt) ──────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 60, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, 60, PW, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text("Driver's Daily Log Report", M, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 175, 200);
  doc.text('FMCSA 70-Hour / 8-Day HOS Ruleset', M, 50);
  doc.text(`Generated: ${today}`, PW - M, 50, { align: 'right' });

  // ── Section A: Driver + Route (full width, below header) ─────────────────
  // Two sub-columns side by side
  const sectionAy  = 76;
  const sectionAh  = 230;
  const colGap     = 18;
  const colW       = (PW - M * 2 - colGap) / 2;   // ~346 pt each
  const LC = M, RC = M + colW + colGap;

  // Left — DRIVER INFORMATION card
  sectionTitle(doc, 'DRIVER INFORMATION', LC, sectionAy + 10);

  const cardY  = sectionAy + 20;
  const cardH  = 170;
  doc.setFillColor(...SAND);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(LC, cardY, colW, cardH, 4, 4, 'FD');

  const halfW = colW / 2 - 16;
  const C1    = LC + 12;
  const C2    = LC + colW / 2 + 8;
  const RH    = 36;
  let iy = cardY + 16;

  lbl(doc, 'Driver Name',           C1, iy);      val(doc, driverInfo.driverName,   C1, iy + 10, halfW);
  lbl(doc, 'Carrier / Company',     C2, iy);      val(doc, driverInfo.carrierName,  C2, iy + 10, halfW);
  iy += RH;
  lbl(doc, 'Truck / Tractor No.',   C1, iy);      val(doc, driverInfo.truckNumber,  C1, iy + 10, halfW);
  lbl(doc, 'Trailer No.(s)',        C2, iy);      val(doc, driverInfo.trailerNumber,C2, iy + 10, halfW);
  iy += RH;
  lbl(doc, 'License Plate / State', C1, iy);      val(doc, driverInfo.licensePlate, C1, iy + 10, halfW);
  lbl(doc, 'Home Terminal',         C2, iy);      val(doc, driverInfo.homeTerminal, C2, iy + 10, halfW);
  iy += RH;
  lbl(doc, 'Main Office Address',   C1, iy);      val(doc, driverInfo.officeAddress,C1, iy + 10, colW - 24);

  // Right — TRIP ROUTE card
  sectionTitle(doc, 'TRIP ROUTE', RC, sectionAy + 10);

  doc.setFillColor(...SAND);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(RC, cardY, colW, cardH, 4, 4, 'FD');

  // 3 route stop boxes stacked
  const stopH = 44, stopGap = 8;
  const stops = [
    { label: 'From — Current Location', val: tripInput?.current_location,  dot: NAVY },
    { label: 'Pickup Location',         val: tripInput?.pickup_location,   dot: [34, 197, 94] },
    { label: 'Dropoff / Destination',   val: tripInput?.dropoff_location,  dot: [239, 68, 68] },
  ];
  let sy = cardY + 14;
  stops.forEach(({ label, val: loc, dot }, i) => {
    // Dot + connector line
    const dotX = RC + 22, dotY = sy + stopH / 2;
    doc.setFillColor(...dot);
    doc.circle(dotX, dotY, 5, 'F');
    if (i < stops.length - 1) {
      doc.setDrawColor(...MUTED);
      doc.setLineWidth(0.8);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(dotX, dotY + 5, dotX, sy + stopH + stopGap + stopH / 2 - 5);
      doc.setLineDashPattern([], 0);
    }
    lbl(doc, label, RC + 36, sy + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(doc.splitTextToSize(loc || '—', colW - 52), RC + 36, sy + 24);
    sy += stopH + stopGap;
  });

  // ── Section B: Stats + Remarks (full-width band) ─────────────────────────
  const sectionBy = sectionAy + sectionAh + 8;   // ~318 pt from top
  const sectionBh = PH - sectionBy - 28;          // fills to footer

  const totalMiles = (tripData.total_distance_miles || 0).toFixed(0);
  const totalHours = (tripData.total_duration_hours || 0).toFixed(1);
  const restCount  = (tripData.events || []).filter(e =>
    ['REST_10H', 'RESTART_34H', 'REST_30'].includes(e.event_type)
  ).length;

  // 4 stat tiles + 1 remarks tile — fixed compact height
  const tileH = 105;
  const tileGap = 8;
  const statW = (PW - M * 2 - tileGap * 4) / 5;

  const tiles = [
    { val: `${totalMiles}`, unit: 'mi',    lbl: 'Total Distance' },
    { val: `${totalHours}`, unit: 'h',     lbl: 'Drive Duration' },
    { val: String(restCount), unit: 'stops', lbl: 'Rest Stops' },
    { val: String(logSheets.length), unit: 'days', lbl: 'Log Days' },
  ];

  tiles.forEach(({ val: v, unit, lbl: label }, i) => {
    const tx = M + i * (statW + tileGap);

    // Tile background
    doc.setFillColor(...SAND);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(tx, sectionBy, statW, tileH, 4, 4, 'FD');

    // Top amber accent line
    doc.setFillColor(...AMBER);
    doc.roundedRect(tx, sectionBy, statW, 3, 2, 2, 'F');

    // Big number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...NAVY);
    doc.text(v, tx + statW / 2, sectionBy + 46, { align: 'center' });

    // Unit
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...AMBER);
    doc.text(unit, tx + statW / 2, sectionBy + 62, { align: 'center' });

    // Label
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), tx + statW / 2, sectionBy + 78, { align: 'center' });


  });

  // Remarks tile
  const remarksTx = M + 4 * (statW + tileGap);
  doc.setFillColor(...SAND);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(remarksTx, sectionBy, statW, tileH, 4, 4, 'FD');
  doc.setFillColor(...AMBER);
  doc.roundedRect(remarksTx, sectionBy, statW, 3, 2, 2, 'F');
  lbl(doc, 'Remarks', remarksTx + 10, sectionBy + 16);
  for (let li = 0; li < 4; li++) {
    const lineY = sectionBy + 28 + li * 16;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(remarksTx + 10, lineY, remarksTx + statW - 10, lineY);
  }

  pageFooter(doc, 'Generated by ELD Trip Planner  ·  Retain as per FMCSA 49 CFR Part 395 regulations');

  // ══════════════════════════════════════════════════════════════════════════
  // PAGES 2+ — ELD Log Sheets
  // ══════════════════════════════════════════════════════════════════════════
  logSheets.forEach(({ date, image_base64 }) => {
    doc.addPage();

    const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PW, 56, 'F');
    doc.setFillColor(...AMBER);
    doc.rect(0, 56, PW, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text(`ELD Log Sheet  —  ${dateFormatted}`, M, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(160, 175, 200);
    doc.text(`Driver: ${driverInfo.driverName || '—'}`, M, 46);
    doc.text(`Carrier: ${driverInfo.carrierName || '—'}`, PW - M, 46, { align: 'right' });

    // Log image — 1400×500 aspect ratio
    const imgM = 24;
    const imgW = PW - imgM * 2;
    const imgH = Math.round(imgW * (500 / 1400));
    const imgY = 64;

    doc.addImage(`data:image/png;base64,${image_base64}`, 'PNG', imgM, imgY, imgW, imgH);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.rect(imgM, imgY, imgW, imgH);

    pageFooter(
      doc,
      `Truck: ${driverInfo.truckNumber || '—'}  |  Trailer: ${driverInfo.trailerNumber || '—'}  |  License: ${driverInfo.licensePlate || '—'}`,
      `Home Terminal: ${driverInfo.homeTerminal || '—'}  |  Office: ${driverInfo.officeAddress || '—'}`,
    );
  });

  const safeName = (driverInfo.driverName || 'driver').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateSlug = new Date().toISOString().split('T')[0];
  doc.save(`eld-logs-${safeName}-${dateSlug}.pdf`);
}


