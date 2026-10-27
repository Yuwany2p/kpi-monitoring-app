import { formatDate, formatNumber } from './formatters';
import { planStatusLabel, mainIssueText } from './reportContent';

const COLOR_LABEL = { green: 'Hijau', yellow: 'Kuning', red: 'Merah' };
const COLOR_RGB = { green: [16, 185, 129], yellow: [245, 158, 11], red: [239, 68, 68] };
const ASTRA = [18, 71, 176];

const pct = (v) => (v === null || v === undefined ? '-' : `${Math.round(Number(v))}%`);

const safeFileName = (content, ext) =>
  `Laporan_KPI_${(content.team_name || 'Tim').replace(/\s+/g, '_')}_${(content.period_name || '').replace(/\s+/g, '_')}.${ext}`;

/** Gambar grafik garis sederhana langsung di PDF (tanpa canvas). */
const drawTrendChart = (doc, trend, x, y, w, h) => {
  const points = trend.filter((t) => t.score !== null && t.score !== undefined);
  doc.setDrawColor(226, 232, 240);
  doc.rect(x, y, w, h);
  if (points.length === 0) {
    doc.setFontSize(8).setTextColor(148, 163, 184).text('Belum ada data tren', x + w / 2, y + h / 2, { align: 'center' });
    return;
  }
  const values = points.map((p) => p.score);
  const min = Math.max(0, Math.floor((Math.min(...values, 100) - 10) / 10) * 10);
  const max = Math.ceil((Math.max(...values, 100) + 5) / 10) * 10;
  const padL = 10;
  const padB = 8;
  const innerW = w - padL - 4;
  const innerH = h - padB - 4;
  const toX = (i) => x + padL + (trend.length === 1 ? innerW / 2 : (innerW * i) / (trend.length - 1));
  const toY = (v) => y + 4 + innerH - ((v - min) / (max - min)) * innerH;

  // garis target 100%
  doc.setDrawColor(16, 185, 129).setLineDashPattern([1, 1], 0);
  doc.line(x + padL, toY(100), x + w - 4, toY(100));
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6).setTextColor(16, 185, 129).text('100%', x + 1, toY(100) + 1);

  doc.setFontSize(6).setTextColor(100, 116, 139);
  doc.text(`${min}%`, x + 1, toY(min));
  trend.forEach((t, i) => doc.text(t.label, toX(i), y + h - 2, { align: 'center' }));

  doc.setDrawColor(...ASTRA).setLineWidth(0.6);
  let prev = null;
  trend.forEach((t, i) => {
    if (t.score === null || t.score === undefined) return;
    const pt = [toX(i), toY(t.score)];
    if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
    prev = pt;
  });
  doc.setFillColor(255, 255, 255);
  trend.forEach((t, i) => {
    if (t.score === null || t.score === undefined) return;
    doc.circle(toX(i), toY(t.score), 0.9, 'FD');
  });
  doc.setLineWidth(0.2);
};

/** Buat PDF laporan. Mengembalikan Blob; jika download=true juga mengunduh. */
export const exportReportPdf = async (content, { download = true } = {}) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const sections = content.sections || {};
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFillColor(...ASTRA).rect(0, 0, pageW, 6, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(15, 23, 42);
  doc.text(`Laporan KPI ${content.team_name || ''}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
  doc.text(`Periode ${content.period_name} · Disusun oleh ${content.author_name} · ${formatDate(content.generated_at)}`, margin, y);
  y += 10;

  if (sections.ringkasan !== false) {
    const metrics = [
      ['Skor tim', pct(content.team_score), [15, 23, 42]],
      ['Hijau', String(content.counts?.green ?? 0), COLOR_RGB.green],
      ['Kuning', String(content.counts?.yellow ?? 0), COLOR_RGB.yellow],
      ['Merah', String(content.counts?.red ?? 0), COLOR_RGB.red],
    ];
    metrics.forEach(([label, value, rgb], i) => {
      const x = margin + i * 40;
      doc.setFontSize(8).setTextColor(100, 116, 139).text(label, x, y);
      doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...rgb).text(value, x, y + 8);
      doc.setFont('helvetica', 'normal');
    });
    y += 14;
    doc.setFontSize(8).setTextColor(100, 116, 139);
    doc.text(`${content.scored} dari ${content.total} indikator-staf sudah tervalidasi.`, margin, y);
    y += 6;

    const indicatorCodes = (content.indicators || []).map((i) => i.code);
    autoTable(doc, {
      startY: y,
      head: [['Staf', ...(content.indicators || []).map((i) => i.name), 'Skor', 'Status']],
      body: (content.staff || []).map((s) => [
        s.name,
        ...indicatorCodes.map((c) => pct(s.values?.[c])),
        pct(s.score),
        COLOR_LABEL[s.color] || '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: ASTRA },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (sections.tren !== false && content.trend?.length) {
    if (y > 230) {
      doc.addPage();
      y = 18;
    }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42).text('Tren Skor Tim', margin, y);
    doc.setFont('helvetica', 'normal');
    drawTrendChart(doc, content.trend, margin, y + 3, pageW - margin * 2, 45);
    y += 55;
  }

  if (sections.kpiWarna !== false) {
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42).text('KPI Merah & Kuning', margin, y);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: y + 3,
      head: [['Staf', 'Indikator', 'Target', 'Realisasi', 'Capaian', 'Status']],
      body: (content.issues || []).length
        ? content.issues.map((r) => [
            r.staff,
            r.indicator,
            `${formatNumber(r.target)} ${r.unit}`,
            `${formatNumber(r.actual)} ${r.unit}`,
            pct(r.pct),
            COLOR_LABEL[r.color],
          ])
        : [[{ content: 'Tidak ada KPI merah/kuning.', colSpan: 6 }]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: ASTRA },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (sections.actionPlan !== false) {
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42).text('Action Plan', margin, y);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: y + 3,
      head: [['Staf', 'Indikator', 'Rencana tindakan', 'PJ', 'Batas', 'Status']],
      body: (content.plans || []).length
        ? content.plans.map((p) => [p.staff, p.indicator, p.action, p.pic, formatDate(p.due_date), planStatusLabel(p.status)])
        : [[{ content: 'Belum ada action plan.', colSpan: 6 }]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: ASTRA },
      columnStyles: { 2: { cellWidth: 60 } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (y > 255) {
    doc.addPage();
    y = 18;
  }
  doc.setFontSize(9).setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold').text('Masalah utama: ', margin, y);
  doc.setFont('helvetica', 'normal').text(mainIssueText(content), margin + 26, y);
  y += 5;
  doc.setFont('helvetica', 'bold').text('Tindak lanjut: ', margin, y);
  doc.setFont('helvetica', 'normal').text(
    `${(content.plans || []).filter((p) => p.status !== 'done').length} action plan berjalan.`,
    margin + 26,
    y
  );
  if (content.notes) {
    y += 7;
    doc.setFont('helvetica', 'italic').setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(`Catatan supervisor: "${content.notes}"`, pageW - margin * 2), margin, y);
  }

  const blob = doc.output('blob');
  if (download) doc.save(safeFileName(content, 'pdf'));
  return blob;
};

/** Ekspor laporan ke Excel (.xlsx) dengan beberapa sheet. */
export const exportReportExcel = async (content) => {
  const { default: writeXlsxFile } = await import('write-excel-file');
  const header = (labels) => labels.map((value) => ({ value, fontWeight: 'bold', backgroundColor: '#DBEAFE' }));
  const num = (v) => (v === null || v === undefined ? null : { type: Number, value: Math.round(Number(v) * 10) / 10 });
  const indicatorCodes = (content.indicators || []).map((i) => i.code);

  const ringkasan = [
    [{ value: `Laporan KPI ${content.team_name}`, fontWeight: 'bold' }],
    [{ value: `Periode ${content.period_name}` }],
    [{ value: `Disusun oleh ${content.author_name}` }],
    [],
    header(['Metrik', 'Nilai']),
    [{ value: 'Skor tim (%)' }, num(content.team_score)],
    [{ value: 'KPI hijau' }, num(content.counts?.green)],
    [{ value: 'KPI kuning' }, num(content.counts?.yellow)],
    [{ value: 'KPI merah' }, num(content.counts?.red)],
    [{ value: 'Data tervalidasi' }, { value: `${content.scored} dari ${content.total}` }],
    [],
    header(['Indikator', 'Bobot (%)', 'Rata-rata capaian (%)']),
    ...(content.indicators || []).map((i) => [{ value: i.name }, num(i.weight), num(i.avg)]),
    [],
    [{ value: 'Catatan supervisor', fontWeight: 'bold' }],
    [{ value: content.notes || '-' }],
  ];

  const staf = [
    header(['Staf', ...(content.indicators || []).map((i) => `${i.name} (%)`), 'Skor (%)', 'Status']),
    ...(content.staff || []).map((s) => [
      { value: s.name },
      ...indicatorCodes.map((c) => num(s.values?.[c])),
      num(s.score),
      { value: COLOR_LABEL[s.color] || '-' },
    ]),
  ];

  const tren = [
    header(['Periode', 'Skor tim (%)']),
    ...(content.trend || []).map((t) => [{ value: t.label }, num(t.score)]),
  ];

  const masalah = [
    header(['Staf', 'Indikator', 'Target', 'Realisasi', 'Satuan', 'Capaian (%)', 'Status']),
    ...(content.issues || []).map((r) => [
      { value: r.staff },
      { value: r.indicator },
      num(r.target),
      num(r.actual),
      { value: r.unit },
      num(r.pct),
      { value: COLOR_LABEL[r.color] },
    ]),
  ];

  const actionPlan = [
    header(['Staf', 'Indikator', 'Analisis', 'Rencana tindakan', 'Penanggung jawab', 'Batas waktu', 'Status']),
    ...(content.plans || []).map((p) => [
      { value: p.staff },
      { value: p.indicator },
      { value: p.analysis },
      { value: p.action },
      { value: p.pic },
      { value: formatDate(p.due_date) },
      { value: planStatusLabel(p.status) },
    ]),
  ];

  await writeXlsxFile([ringkasan, staf, tren, masalah, actionPlan], {
    sheets: ['Ringkasan', 'Capaian Staf', 'Tren', 'KPI Merah-Kuning', 'Action Plan'],
    fileName: safeFileName(content, 'xlsx'),
  });
};
