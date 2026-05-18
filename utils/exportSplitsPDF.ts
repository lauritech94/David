import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleLabel } from '@/lib/creditRoles';

interface SplitsRelease {
  title: string;
  type: 'album' | 'ep' | 'single';
  release_date: string | null;
  label: string | null;
  upc: string | null;
  artist?: { name: string } | null;
  release_artists?: { role: string; artist?: { name: string } | null }[];
}

interface SplitsTrack {
  id: string;
  title: string;
  track_number: number;
  isrc: string | null;
}

interface SplitsCredit {
  track_id: string;
  name: string;
  role: string;
  publishing_percentage: number | null;
  master_percentage: number | null;
  pro_society?: string | null;
  notes?: string | null;
  ipi_number?: string | null;
}

export interface SplitsNote {
  /** null = nota global del release */
  track_id: string | null;
  scope: 'publishing' | 'master';
  note: string;
}

const PAGE_WIDTH = 210;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const LINE_HEIGHT = 5;
const PAGE_BOTTOM = 280;

function addPageIfNeeded(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawSeparator(doc: jsPDF, y: number): number {
  y = addPageIfNeeded(doc, y, 10);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  return y + 6;
}

interface GroupedSplit {
  name: string;
  roles: string[];
  percentage: number;
  pro_society?: string | null;
  notes?: string | null;
  ipi_number?: string | null;
}

function groupByPerson(credits: SplitsCredit[], type: 'publishing' | 'master'): GroupedSplit[] {
  const map = new Map<string, GroupedSplit>();
  for (const c of credits) {
    const pct = type === 'publishing' ? c.publishing_percentage : c.master_percentage;
    if (pct == null || pct <= 0) continue;
    const key = c.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { name: c.name, roles: [], percentage: 0, pro_society: c.pro_society, notes: c.notes, ipi_number: c.ipi_number });
    }
    const entry = map.get(key)!;
    const roleLabel = getRoleLabel(c.role);
    if (!entry.roles.includes(roleLabel)) {
      entry.roles.push(roleLabel);
    }
    // Keep the first non-empty pro_society, notes, ipi
    if (!entry.pro_society && c.pro_society) entry.pro_society = c.pro_society;
    if (!entry.notes && c.notes) entry.notes = c.notes;
    if (!entry.ipi_number && c.ipi_number) entry.ipi_number = c.ipi_number;
    entry.percentage += pct;
  }
  return Array.from(map.values()).sort((a, b) => b.percentage - a.percentage);
}

/**
 * Draw a split table. Publishing gets 5 columns (with PRO and Notas placeholders),
 * Master gets 3 columns.
 */
function drawSplitTable(
  doc: jsPDF,
  y: number,
  title: string,
  rows: GroupedSplit[],
  pctHeader: string,
  isPublishing: boolean,
): number {
  if (rows.length === 0) return y;

  y = addPageIfNeeded(doc, y, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN_LEFT + 5, y);
  y += 6;

  const colName = MARGIN_LEFT + 8;

  if (isPublishing) {
    // 5 columns: Nombre | Rol | % Recaudable | Sociedad (PRO) | Notas
    const colRoles = MARGIN_LEFT + 50;
    const colPct = MARGIN_LEFT + 100;
    const colPro = MARGIN_LEFT + 125;
    const colNotas = PAGE_WIDTH - MARGIN_RIGHT - 5;

    // Header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('Nombre', colName, y);
    doc.text('Rol', colRoles, y);
    doc.text(pctHeader, colPct, y);
    doc.text('Sociedad (PRO)', colPro, y);
    doc.text('Notas', colNotas, y, { align: 'right' });
    y += 1;
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(colName, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 4;
    doc.setTextColor(0);

    let total = 0;
    for (const row of rows) {
      y = addPageIfNeeded(doc, y, 7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(row.name, colName, y);
      // Truncate roles to fit column
      const rolesText = row.roles.join(' / ');
      const truncatedRoles = doc.splitTextToSize(rolesText, 48)[0] || rolesText;
      doc.text(truncatedRoles, colRoles, y);
      doc.text(`${row.percentage}%`, colPct, y);
      // Use real data or placeholder
      const proText = row.pro_society || '[________]';
      const notesText = row.notes || '[________]';
      doc.setTextColor(row.pro_society ? 0 : 130);
      doc.text(proText, colPro, y);
      doc.setTextColor(row.notes ? 0 : 130);
      doc.text(notesText, colNotas, y, { align: 'right' });
      doc.setTextColor(0);
      total += row.percentage;
      y += LINE_HEIGHT + 0.5;

      // IPI line (under the name) — only if available
      if (row.ipi_number) {
        doc.setFontSize(7);
        doc.setTextColor(110);
        doc.text(`IPI: ${row.ipi_number}`, colName, y);
        doc.setTextColor(0);
        doc.setFontSize(9);
        y += 3.5;
      }
    }

    // Total row
    y += 1;
    doc.setDrawColor(200);
    doc.line(colName, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Total', colName, y);
    doc.text(`${Math.round(total * 100) / 100}%`, colPct, y);
    y += 7;
  } else {
    // 3 columns: Nombre | Roles | %
    const colRoles = MARGIN_LEFT + 70;
    const colPct = PAGE_WIDTH - MARGIN_RIGHT - 15;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('Nombre', colName, y);
    doc.text('Roles', colRoles, y);
    doc.text(pctHeader, colPct, y, { align: 'right' });
    y += 1;
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(colName, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 4;
    doc.setTextColor(0);

    let total = 0;
    for (const row of rows) {
      y = addPageIfNeeded(doc, y, 7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(row.name, colName, y);
      doc.text(row.roles.join(' / '), colRoles, y);
      doc.text(`${row.percentage}%`, colPct, y, { align: 'right' });
      total += row.percentage;
      y += LINE_HEIGHT + 0.5;
    }

    y += 1;
    doc.setDrawColor(200);
    doc.line(colName, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Total', colName, y);
    doc.text(`${Math.round(total * 100) / 100}%`, colPct, y, { align: 'right' });
    y += 7;
  }

  return y;
}

function getArtistDisplay(release: SplitsRelease): string {
  if (release.release_artists && release.release_artists.length > 0) {
    const mainNames = release.release_artists.filter(ra => ra.role !== 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    const featNames = release.release_artists.filter(ra => ra.role === 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    return mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }
  return release.artist?.name || '—';
}

interface UniqueParticipant {
  name: string;
  hasPublishing: boolean;
  hasMaster: boolean;
  ipi_number?: string | null;
}

function collectUniqueParticipants(credits: SplitsCredit[]): UniqueParticipant[] {
  const map = new Map<string, UniqueParticipant>();
  for (const c of credits) {
    const key = c.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { name: c.name, hasPublishing: false, hasMaster: false, ipi_number: c.ipi_number });
    }
    const entry = map.get(key)!;
    if (c.publishing_percentage != null && c.publishing_percentage > 0) entry.hasPublishing = true;
    if (c.master_percentage != null && c.master_percentage > 0) entry.hasMaster = true;
    if (!entry.ipi_number && c.ipi_number) entry.ipi_number = c.ipi_number;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function exportSplitsPDF(
  release: SplitsRelease,
  tracks: SplitsTrack[],
  credits: SplitsCredit[],
  notes: SplitsNote[] = [],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;

  const globalPublishingNote = notes.find((n) => n.track_id === null && n.scope === 'publishing');
  const globalMasterNote = notes.find((n) => n.track_id === null && n.scope === 'master');
  const trackNotes = (trackId: string, scope: 'publishing' | 'master') =>
    notes.find((n) => n.track_id === trackId && n.scope === scope);

  const drawNoteBox = (label: string, text: string): void => {
    if (!text?.trim()) return;
    y = addPageIfNeeded(doc, y, 20);
    const boxX = MARGIN_LEFT;
    const boxW = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 90, 0);
    doc.text(label, boxX + 2, y + 4);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(text, boxW - 4);
    const boxH = 6 + lines.length * 4 + 2;
    doc.setDrawColor(220, 180, 90);
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(boxX, y, boxW, boxH, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 90, 0);
    doc.text(label, boxX + 2, y + 4);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60);
    doc.text(lines, boxX + 2, y + 9);
    doc.setTextColor(0);
    y += boxH + 4;
  };

  const drawInlineNote = (text: string): void => {
    if (!text?.trim()) return;
    y = addPageIfNeeded(doc, y, 10);
    const boxW = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(90);
    const lines = doc.splitTextToSize(`Nota: ${text}`, boxW);
    doc.text(lines, MARGIN_LEFT + 5, y);
    doc.setTextColor(0);
    y += lines.length * 4 + 3;
  };

  // ── Title ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('HOJA DE REPARTO DE DERECHOS (SPLIT SHEET)', MARGIN_LEFT, y);
  y += 10;

  y = drawSeparator(doc, y);

  // ── INFORMACIÓN DEL PROYECTO ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL PROYECTO', MARGIN_LEFT, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const typeLabel = release.type === 'single' ? 'Single' : release.type === 'ep' ? 'EP' : 'Álbum';
  const artistDisplay = getArtistDisplay(release);

  const headerFields: [string, string][] = [
    [`Título del ${typeLabel}`, release.title],
    ['Artista Principal', artistDisplay],
  ];
  if (release.label) headerFields.push(['Sello Discográfico', release.label]);
  if (release.upc) headerFields.push(['UPC', release.upc]);
  if (release.release_date) {
    headerFields.push([
      'Fecha de Lanzamiento',
      format(new Date(release.release_date), "d 'de' MMMM yyyy", { locale: es }),
    ]);
  }

  for (const [label, value] of headerFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}: `, MARGIN_LEFT, y);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN_LEFT + labelWidth, y);
    y += LINE_HEIGHT + 1;
  }

  y += 2;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Exportado: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, MARGIN_LEFT, y);
  doc.setTextColor(0);
  y += 10;

  // ── NOTAS GENERALES (release-level) ──
  if (globalPublishingNote || globalMasterNote) {
    if (globalPublishingNote) drawNoteBox('NOTA GENERAL — PUBLISHING', globalPublishingNote.note);
    if (globalMasterNote) drawNoteBox('NOTA GENERAL — MASTER', globalMasterNote.note);
  }

  // ── DETALLE POR PISTA ──
  y = drawSeparator(doc, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE POR PISTA', MARGIN_LEFT, y);
  y += 8;

  const sortedTracks = [...tracks].sort((a, b) => a.track_number - b.track_number);

  for (const track of sortedTracks) {
    y = addPageIfNeeded(doc, y, 30);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${track.track_number}. ${track.title}`, MARGIN_LEFT, y);
    y += 7;

    if (track.isrc) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`ISRC: ${track.isrc}`, MARGIN_LEFT + 5, y);
      doc.setTextColor(0);
      y += 7;
    } else {
      y += 2;
    }

    const trackCredits = credits.filter(c => c.track_id === track.id);
    const publishingRows = groupByPerson(trackCredits, 'publishing');
    const masterRows = groupByPerson(trackCredits, 'master');

    if (publishingRows.length === 0 && masterRows.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150);
      doc.text('Sin splits asignados', MARGIN_LEFT + 5, y);
      doc.setTextColor(0);
      y += 8;
    } else {
      y = drawSplitTable(doc, y, 'AUTORÍA / PUBLISHING (Derechos de Obra)', publishingRows, '% Recaudable', true);
      const pubNote = trackNotes(track.id, 'publishing');
      if (pubNote) drawInlineNote(pubNote.note);

      y = drawSplitTable(doc, y, 'MASTER / ROYALTIES (Derechos de Fonograma)', masterRows, '%', false);
      const mstNote = trackNotes(track.id, 'master');
      if (mstNote) drawInlineNote(mstNote.note);
    }

    // separator between tracks
    if (track !== sortedTracks[sortedTracks.length - 1]) {
      y = drawSeparator(doc, y);
    }
    y += 2;
  }

  // ── DATOS DE CONTACTO Y REGISTRO ──
  const participants = collectUniqueParticipants(credits);
  if (participants.length > 0) {
    y += 4;
    y = drawSeparator(doc, y);
    y = addPageIfNeeded(doc, y, 30 + participants.length * 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE CONTACTO Y REGISTRO', MARGIN_LEFT, y);
    y += 7;

    const colParticipant = MARGIN_LEFT + 5;
    const colIPI = MARGIN_LEFT + 55;
    const colEmail = MARGIN_LEFT + 95;
    const colFirma = PAGE_WIDTH - MARGIN_RIGHT - 25;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('Participante', colParticipant, y);
    doc.text('IPI/CAE', colIPI, y);
    doc.text('Correo Electrónico', colEmail, y);
    doc.text('Firma', colFirma, y);
    y += 1;
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(colParticipant, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 4;
    doc.setTextColor(0);

    for (const p of participants) {
      y = addPageIfNeeded(doc, y, 7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(p.name, colParticipant, y);
      let ipiValue: string;
      if (p.ipi_number) ipiValue = p.ipi_number;
      else if (p.hasPublishing) ipiValue = '[A completar]';
      else ipiValue = 'N/A (Solo Master)';
      doc.text(ipiValue, colIPI, y);
      doc.text('[A completar]', colEmail, y);
      // firma: draw a small line
      doc.setDrawColor(180);
      doc.line(colFirma, y + 1, PAGE_WIDTH - MARGIN_RIGHT, y + 1);
      y += LINE_HEIGHT + 1;
    }
    y += 4;
  }

  // ── Legal footer ──
  y = addPageIfNeeded(doc, y, 20);
  y = drawSeparator(doc, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  const legalText = 'Este documento certifica la voluntad de las partes para el registro y reparto de beneficios derivados de la explotación de las obras y fonogramas aquí listados.';
  const legalLines = doc.splitTextToSize(legalText, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT);
  doc.text(legalLines, MARGIN_LEFT, y);
  doc.setTextColor(0);

  const safeName = release.title
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  doc.save(`splits_derechos_${safeName}.pdf`);
}
