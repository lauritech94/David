import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getRoleLabel,
  getRoleCategory5,
  getDistributorRoleLabel,
  ROLE_ORDER,
} from '@/lib/creditRoles';

interface LabelCopyRelease {
  title: string;
  type: 'album' | 'ep' | 'single';
  release_date: string | null;
  label: string | null;
  upc: string | null;
  copyright: string | null;
  genre: string | null;
  secondary_genre: string | null;
  language: string | null;
  production_year: number | null;
  artist?: { name: string } | null;
  release_artists?: { role: string; artist?: { name: string } | null }[];
}

interface LabelCopyTrack {
  id: string;
  title: string;
  track_number: number;
  isrc: string | null;
  lyrics: string | null;
  explicit: boolean | null;
  c_copyright_holder: string | null;
  c_copyright_year: number | null;
  p_copyright_holder: string | null;
  p_production_year: number | null;
}

interface LabelCopyCredit {
  track_id: string;
  name: string;
  role: string;
  publishing_percentage: number | null;
  master_percentage: number | null;
}

interface LabelCopyTrackArtist {
  track_id: string;
  role: string;
  artist_name: string;
}

const PAGE_WIDTH = 210;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
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

function buildArtistDisplay(
  trackArtists: LabelCopyTrackArtist[],
  trackId: string,
  fallbackRelease: LabelCopyRelease,
): string {
  const ta = trackArtists.filter(a => a.track_id === trackId);
  if (ta.length > 0) {
    const mainNames = ta.filter(a => a.role !== 'featuring').map(a => a.artist_name).filter(Boolean);
    const featNames = ta.filter(a => a.role === 'featuring').map(a => a.artist_name).filter(Boolean);
    return mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }
  if (fallbackRelease.release_artists && fallbackRelease.release_artists.length > 0) {
    const mainNames = fallbackRelease.release_artists.filter(ra => ra.role !== 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    const featNames = fallbackRelease.release_artists.filter(ra => ra.role === 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    return mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }
  return fallbackRelease.artist?.name || '—';
}

// ─── PDF Section mapping ─────────────────────────────────────
// Maps internal roles to Label Copy sections with English labels

type LabelCopySection = 'COMPOSITION' | 'PRODUCTION' | 'PERFORMANCE' | 'ADDITIONAL CONTRIBUTORS';

const SECTION_ROLE_MAP: Record<string, LabelCopySection> = {
  // COMPOSITION
  compositor: 'COMPOSITION',
  autor: 'COMPOSITION',
  letrista: 'COMPOSITION',
  'co-autor': 'COMPOSITION',
  libretista: 'COMPOSITION',
  editorial: 'COMPOSITION',
  // PRODUCTION (includes arreglista & director_orquesta moved here per industry standard)
  arreglista: 'PRODUCTION',
  director_orquesta: 'PRODUCTION',
  productor: 'PRODUCTION',
  productor_asistente: 'PRODUCTION',
  productor_ejecutivo: 'PRODUCTION',
  coproductor: 'PRODUCTION',
  ingeniero_mezcla: 'PRODUCTION',
  masterizador: 'PRODUCTION',
  ingeniero_sonido: 'PRODUCTION',
  ingeniero_grabacion: 'PRODUCTION',
  director_musical: 'PRODUCTION',
  programador: 'PRODUCTION',
  mezclador: 'PRODUCTION',
  estudio_grabacion: 'PRODUCTION',
  // ADDITIONAL
  remixer: 'ADDITIONAL CONTRIBUTORS',
  dj: 'ADDITIONAL CONTRIBUTORS',
  sello: 'ADDITIONAL CONTRIBUTORS',
  actor: 'ADDITIONAL CONTRIBUTORS',
  director_video: 'ADDITIONAL CONTRIBUTORS',
  director_arte: 'ADDITIONAL CONTRIBUTORS',
  fotografo: 'ADDITIONAL CONTRIBUTORS',
  disenador: 'ADDITIONAL CONTRIBUTORS',
  otro: 'ADDITIONAL CONTRIBUTORS',
};

function getSectionForRole(roleValue: string): LabelCopySection {
  const normalized = roleValue.toLowerCase();
  if (SECTION_ROLE_MAP[normalized]) return SECTION_ROLE_MAP[normalized];
  // All interprete roles → PERFORMANCE
  const cat = getRoleCategory5(normalized);
  if (cat === 'interprete') return 'PERFORMANCE';
  return 'ADDITIONAL CONTRIBUTORS';
}

interface RoleGroup {
  roleLabel: string;
  names: string[];
  sortOrder: number;
}

/**
 * Group credits by role within a section. Returns "RoleLabel: Name1, Name2" entries.
 */
function groupCreditsByRole(credits: LabelCopyCredit[]): RoleGroup[] {
  const map = new Map<string, RoleGroup>();
  for (const c of credits) {
    const roleKey = c.role.toLowerCase();
    if (!map.has(roleKey)) {
      map.set(roleKey, {
        roleLabel: getDistributorRoleLabel(c.role),
        names: [],
        sortOrder: ROLE_ORDER[roleKey] ?? 99,
      });
    }
    const entry = map.get(roleKey)!;
    if (!entry.names.includes(c.name)) {
      entry.names.push(c.name);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

const SECTION_ORDER: LabelCopySection[] = ['COMPOSITION', 'PRODUCTION', 'PERFORMANCE', 'ADDITIONAL CONTRIBUTORS'];

function renderSections(
  doc: jsPDF,
  y: number,
  trackCredits: LabelCopyCredit[],
): number {
  // Group credits by section
  const sectionCredits = new Map<LabelCopySection, LabelCopyCredit[]>();
  for (const c of trackCredits) {
    const section = getSectionForRole(c.role);
    if (!sectionCredits.has(section)) sectionCredits.set(section, []);
    sectionCredits.get(section)!.push(c);
  }

  for (const section of SECTION_ORDER) {
    const credits = sectionCredits.get(section);
    if (!credits || credits.length === 0) continue;

    y = addPageIfNeeded(doc, y, 15);
    y += 2;

    // Section header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text(section, MARGIN_LEFT + 5, y);
    doc.setTextColor(0);
    y += 5;

    // Role: Names lines
    const roleGroups = groupCreditsByRole(credits);
    for (const group of roleGroups) {
      y = addPageIfNeeded(doc, y, 6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const label = `${group.roleLabel}: `;
      doc.text(label, MARGIN_LEFT + 8, y);
      const labelW = doc.getTextWidth(label);
      doc.setFont('helvetica', 'normal');
      const namesText = group.names.join(', ');
      const available = CONTENT_WIDTH - 8 - labelW;
      const wrapped = doc.splitTextToSize(namesText, available);
      doc.text(wrapped[0], MARGIN_LEFT + 8 + labelW, y);
      // Additional wrapped lines
      for (let i = 1; i < wrapped.length; i++) {
        y += LINE_HEIGHT;
        y = addPageIfNeeded(doc, y, 6);
        doc.text(wrapped[i], MARGIN_LEFT + 8 + labelW, y);
      }
      y += LINE_HEIGHT + 0.5;
    }
    y += 2;
  }

  return y;
}

export function exportLabelCopyPDF(
  release: LabelCopyRelease,
  tracks: LabelCopyTrack[],
  credits: LabelCopyCredit[],
  trackArtists: LabelCopyTrackArtist[] = [],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LABEL COPY', MARGIN_LEFT, y);
  y += 10;

  y = drawSeparator(doc, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const typeLabel = release.type === 'single' ? 'Single' : release.type === 'ep' ? 'EP' : 'Álbum';

  let artistDisplay = release.artist?.name || '—';
  if (release.release_artists && release.release_artists.length > 0) {
    const mainNames = release.release_artists.filter(ra => ra.role !== 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    const featNames = release.release_artists.filter(ra => ra.role === 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    artistDisplay = mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }

  const headerFields: [string, string][] = [
    ['Title', release.title],
    ['Artist', artistDisplay],
    ['Type', typeLabel],
  ];
  if (release.label) headerFields.push(['Label', release.label]);
  if (release.upc) headerFields.push(['UPC', release.upc]);
  if (release.genre) headerFields.push(['Genre', release.genre]);
  if (release.secondary_genre) headerFields.push(['Secondary Genre', release.secondary_genre]);
  if (release.language) headerFields.push(['Language', release.language]);
  if (release.production_year) headerFields.push(['Production Year', String(release.production_year)]);
  if (release.release_date) {
    headerFields.push([
      'Release Date',
      format(new Date(release.release_date), "d 'de' MMMM yyyy", { locale: es }),
    ]);
  }
  if (release.copyright) headerFields.push(['Copyright', release.copyright]);

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
  doc.text(`Exported: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, MARGIN_LEFT, y);
  doc.setTextColor(0);
  y += 8;

  // ── Tracks ──
  const sortedTracks = [...tracks].sort((a, b) => a.track_number - b.track_number);

  for (const track of sortedTracks) {
    y = drawSeparator(doc, y);
    y = addPageIfNeeded(doc, y, 30);

    // Track header: TRACK 01 — Title
    const trackNum = String(track.track_number).padStart(2, '0');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TRACK ${trackNum} — ${track.title}`, MARGIN_LEFT, y);
    y += 7;

    // Artist
    const trackArtistDisplay = buildArtistDisplay(trackArtists, track.id, release);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Artist: ', MARGIN_LEFT + 5, y);
    const artLabelW = doc.getTextWidth('Artist: ');
    doc.setFont('helvetica', 'normal');
    doc.text(trackArtistDisplay, MARGIN_LEFT + 5 + artLabelW, y);
    y += 6;

    if (track.isrc) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`ISRC: ${track.isrc}`, MARGIN_LEFT + 5, y);
      y += 8;
    }

    if (track.explicit) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Explicit Content', MARGIN_LEFT + 5, y);
      y += 6;
    }

    // Copyright per track (if different from release)
    const copyrightLines: string[] = [];
    if (track.c_copyright_holder) {
      copyrightLines.push(`© ${track.c_copyright_year || ''} ${track.c_copyright_holder}`.trim());
    }
    if (track.p_copyright_holder) {
      copyrightLines.push(`℗ ${track.p_production_year || ''} ${track.p_copyright_holder}`.trim());
    }
    if (copyrightLines.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const line of copyrightLines) {
        y = addPageIfNeeded(doc, y, 6);
        doc.text(line, MARGIN_LEFT + 5, y);
        y += 5;
      }
      y += 1;
    }

    // Credits by section (COMPOSITION / PRODUCTION / PERFORMANCE / ADDITIONAL)
    const trackCredits = credits.filter((c) => c.track_id === track.id);
    if (trackCredits.length > 0) {
      y = renderSections(doc, y, trackCredits);
    }

    // Lyrics
    if (track.lyrics) {
      y = addPageIfNeeded(doc, y, 15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80);
      doc.text('LYRICS', MARGIN_LEFT + 5, y);
      doc.setTextColor(0);
      y += 5;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);

      const lines = track.lyrics.split('\n');
      for (const line of lines) {
        if (line.trim() === '') {
          y += 3;
          continue;
        }
        const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH - 10);
        for (const wl of wrapped) {
          y = addPageIfNeeded(doc, y, 6);
          doc.text(wl, MARGIN_LEFT + 8, y);
          y += LINE_HEIGHT;
        }
      }
      doc.setTextColor(0);
      y += 4;
    }

    y += 4;
  }

  const safeName = release.title
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  doc.save(`label_copy_${safeName}.pdf`);
}
