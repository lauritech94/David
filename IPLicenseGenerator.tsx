import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { supabase } from '@/integrations/supabase/client';
import { useContractDrafts, type ContractDraft } from '@/hooks/useContractDrafts';
import { DraftStatusBanner } from '@/components/contract-drafts/DraftStatusBanner';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ArrowRight, Download, Eye, ChevronDown, RotateCcw, Calendar as CalendarIcon, Save, Share2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import jsPDF from 'jspdf';
import { useTracks, useReleases } from '@/hooks/useReleases';
import { PersonSearchInput, type PersonData } from '@/components/PersonSearchInput';
import {
  type IPLegalClauses,
  type IPLicenseLanguage,
  type IPLicenseRecordingType,
  getDefaultIPClauses,
  getPDFLabels,
  numberToEnglishText,
  MONTHS_EN,
  MONTHS_ES,
} from '@/lib/contracts/ipLicenseTemplates';

function numberToSpanishText(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  const units = ['CERO','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  if (n <= 29) return units[n];
  const tens = ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  if (n === 100) return 'CIEN';
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? tens[t] : `${tens[t]} Y ${units[u]}`;
}

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

interface IPLicenseGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfBlob?: Blob }) => void | Promise<void>;
  releaseId?: string;
  draftId?: string;
  onDraftSaved?: () => void;
}

interface AlbumTrack {
  titulo: string;
  duracion: string;
}

interface FormData {
  fecha_dia: string;
  fecha_mes: string;
  fecha_anio: string;
  productora_nombre: string;
  productora_doc_tipo: string;
  productora_dni: string;
  productora_domicilio: string;
  productora_nombre_artistico: string;
  productora_email: string;
  colaboradora_nombre: string;
  colaboradora_doc_tipo: string;
  colaboradora_dni: string;
  colaboradora_domicilio: string;
  colaboradora_nombre_artistico: string;
  colaboradora_email: string;
  titulo_sencillo: string;
  grabacion_titulo: string;
  grabacion_calidad: string;
  grabacion_duracion: string;
  grabacion_videoclip: string;
  grabacion_fecha_fijacion: string;
  grabacion_caracter: string;
  acreditacion_nombre: string;
  acreditacion_caracter: string;
  calidad_entidad: string;
  royalty_porcentaje: string;
  firma_productora: string;
  firma_colaboradora: string;
  // Full album fields
  album_titulo: string;
  album_num_grabaciones: string;
  album_videoclips_si_no: string;
  album_fecha_fijacion_desde: string;
  album_fecha_fijacion_hasta: string;
  album_tracks: AlbumTrack[];
}

// === Editable clauses (interface + defaults imported from shared templates) ===

const IP_CLAUSE_SECTIONS = [
  {
    title: '1. Objeto',
    fields: [
      { key: 'objeto_1_1' as const, label: '1.1 Cesión de derechos' },
      { key: 'objeto_1_2' as const, label: '1.2 Cesión de imagen' },
    ],
  },
  {
    title: '2. Alcance de la cesión',
    fields: [
      { key: 'alcance_2_1' as const, label: '2.1 Amplitud' },
      { key: 'alcance_2_2' as const, label: '2.2 Derechos específicos' },
      { key: 'alcance_2_3' as const, label: '2.3 Acreditación' },
      { key: 'alcance_2_4' as const, label: '2.4 Entidades de gestión' },
      { key: 'alcance_2_5' as const, label: '2.5 Explotación' },
    ],
  },
  {
    title: '3. Contraprestación',
    fields: [
      { key: 'contraprestacion_3_1' as const, label: '3.1 Royalty' },
      { key: 'contraprestacion_3_2' as const, label: '3.2 Prorrata' },
      { key: 'contraprestacion_3_3' as const, label: '3.3 Responsabilidad pago' },
      { key: 'contraprestacion_3_4' as const, label: '3.4 Frecuencia' },
      { key: 'contraprestacion_3_5' as const, label: '3.5 Liquidación' },
    ],
  },
  {
    title: '4. Notificaciones',
    fields: [
      { key: 'notificaciones_4_1' as const, label: '4.1 Medios de comunicación' },
    ],
  },
  {
    title: '5. Confidencialidad',
    fields: [
      { key: 'confidencialidad_5_1' as const, label: '5.1 Información confidencial' },
      { key: 'confidencialidad_5_2' as const, label: '5.2 Protección de datos' },
      { key: 'confidencialidad_5_2b' as const, label: '5.2b Derechos ARCO' },
    ],
  },
  {
    title: '6. Ley aplicable',
    fields: [
      { key: 'ley_6_1' as const, label: '6.1 Ordenamiento' },
      { key: 'ley_6_2' as const, label: '6.2 Resolución de conflictos' },
    ],
  },
];

const STEPS = ['Productora', 'Colaborador/a', 'Grabación y Derechos', 'Cláusulas', 'Vista Previa'];

const defaultData: FormData = {
  fecha_dia: new Date().getDate().toString(), fecha_mes: MESES_ES[new Date().getMonth()], fecha_anio: new Date().getFullYear().toString(),
  productora_nombre: '', productora_doc_tipo: 'DNI', productora_dni: '', productora_domicilio: '',
  productora_nombre_artistico: '', productora_email: '',
  colaboradora_nombre: '', colaboradora_doc_tipo: 'DNI', colaboradora_dni: '', colaboradora_domicilio: '',
  colaboradora_nombre_artistico: '', colaboradora_email: '',
  titulo_sencillo: '', grabacion_titulo: '', grabacion_calidad: 'músico intérprete',
  grabacion_duracion: '', grabacion_videoclip: 'Sí', grabacion_fecha_fijacion: '',
  grabacion_caracter: 'featured artist', acreditacion_nombre: '', acreditacion_caracter: '',
  calidad_entidad: 'músico intérprete', royalty_porcentaje: '20',
  firma_productora: '', firma_colaboradora: '',
  album_titulo: '', album_num_grabaciones: '', album_videoclips_si_no: 'No',
  album_fecha_fijacion_desde: '', album_fecha_fijacion_hasta: '',
  album_tracks: [],
};

function s(val: string | undefined): string {
  return val?.trim() || '___________';
}

function resolveClause(text: string, d: FormData, language: IPLicenseLanguage = 'es'): string {
  const royaltyNum = parseInt(d.royalty_porcentaje) || 0;
  const royaltyText = (language === 'en' ? numberToEnglishText(royaltyNum) : numberToSpanishText(royaltyNum)) || s('');
  return text
    .replace(/\{\{calidad_entidad\}\}/g, s(d.calidad_entidad))
    .replace(/\{\{productora_nombre_artistico\}\}/g, s(d.productora_nombre_artistico))
    .replace(/\{\{royalty_texto\}\}/g, royaltyText)
    .replace(/\{\{royalty_porcentaje\}\}/g, s(d.royalty_porcentaje))
    .replace(/\{\{grabacion_titulo\}\}/g, s(d.grabacion_titulo))
    .replace(/\{\{productora_email\}\}/g, s(d.productora_email))
    .replace(/\{\{colaboradora_email\}\}/g, s(d.colaboradora_email));
}

function generatePDF(d: FormData, clauses: IPLegalClauses, language: IPLicenseLanguage = 'es', recordingType: IPLicenseRecordingType = 'single'): jsPDF {
  const L = getPDFLabels(language);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ml = 30, mr = 30, mb = 25;
  const cw = pw - ml - mr;
  let y = 0;
  let pageNum = 1;

  const interline = 4.9;
  const subItemSpace = 7.7;
  const sectionSpace = 15.5;
  const indent1 = 6.3;
  const indent2 = 12.7;
  const indentSub = 12.5;

  const fontSize = 11;

  const addFooter = () => {
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    pdf.text(String(pageNum), pw / 2, ph - 15, { align: 'center' });
  };

  const checkPage = (needed: number = 10) => {
    if (y + needed > ph - mb) {
      addFooter();
      pdf.addPage();
      pageNum++;
      y = 20;
      pdf.setFont('times', 'normal');
      pdf.setFontSize(fontSize);
    }
  };

  const drawJustifiedLine = (text: string, x: number, yPos: number, maxW: number) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= 1) {
      pdf.text(text, x, yPos);
      return;
    }
    const totalTextWidth = words.reduce((sum, w) => sum + pdf.getTextWidth(w), 0);
    const extraSpace = (maxW - totalTextWidth) / (words.length - 1);
    let cursorX = x;
    for (const word of words) {
      pdf.text(word, cursorX, yPos);
      cursorX += pdf.getTextWidth(word) + extraSpace;
    }
  };

  const renderLines = (text: string, xLeft: number, maxW: number) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'normal');
    const lines: string[] = pdf.splitTextToSize(text, maxW);
    for (let i = 0; i < lines.length; i++) {
      checkPage();
      if (i < lines.length - 1) {
        drawJustifiedLine(lines[i], xLeft, y, maxW);
      } else {
        pdf.text(lines[i], xLeft, y);
      }
      y += interline;
    }
  };

  const addHangingParagraph = (label: string, text: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'bold');
    const labelW = pdf.getTextWidth(label + ' ');
    pdf.text(label, ml, y);
    pdf.setFont('times', 'normal');

    const firstLineW = cw - labelW;
    const restLines = pdf.splitTextToSize(text, firstLineW);

    if (restLines.length > 0) {
      drawJustifiedLine(restLines[0], ml + labelW, y, firstLineW);
      y += interline;
      if (restLines.length > 1) {
        const cont = restLines.slice(1).join(' ');
        const contW = cw - indent1;
        renderLines(cont, ml + indent1, contW);
      }
    } else {
      y += interline;
    }
  };

  const addNumberedHanging = (label: string, text: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'normal');
    const xNum = ml + indent1;
    const xText = ml + indent2;
    const textW = cw - indent2;

    pdf.text(label, xNum, y);
    const labelW = pdf.getTextWidth(label + ' ');
    const firstLineAvail = cw - (indent1 + labelW);
    const allLines = pdf.splitTextToSize(text, Math.min(firstLineAvail, textW));

    if (allLines.length > 0) {
      drawJustifiedLine(allLines[0], xNum + labelW, y, firstLineAvail);
      y += interline;
      if (allLines.length > 1) {
        const cont = allLines.slice(1).join(' ');
        const contLines: string[] = pdf.splitTextToSize(cont, textW);
        for (let i = 0; i < contLines.length; i++) {
          checkPage();
          if (i < contLines.length - 1) {
            drawJustifiedLine(contLines[i], xText, y, textW);
          } else {
            pdf.text(contLines[i], xText, y);
          }
          y += interline;
        }
      }
    } else {
      y += interline;
    }
  };

  const addParagraph = (text: string, indent: number = 0) => {
    pdf.setFont('times', 'normal');
    pdf.setFontSize(fontSize);
    renderLines(text, ml + indent, cw - indent);
  };

  const addSubItem = (letter: string, title: string, value: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    const x = ml + indentSub;
    pdf.setFont('times', 'normal');
    const letterW = pdf.getTextWidth(letter);
    pdf.text(letter, x, y);
    pdf.setFont('times', 'bold');
    const titleW = pdf.getTextWidth(title + ' ');
    pdf.text(title, x + letterW, y);
    pdf.setFont('times', 'normal');
    const valX = x + letterW + titleW;
    const remaining = cw - indentSub - letterW - titleW;
    if (remaining > 0 && pdf.getTextWidth(value) <= remaining) {
      pdf.text(value, valX, y);
      y += subItemSpace;
    } else {
      y += interline;
      renderLines(value, x, cw - indentSub);
      y += subItemSpace - interline;
    }
  };

  const addBoldInline = (boldPart: string, normalPart: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    const x = ml + indent2;
    const maxW = cw - indent2;
    pdf.setFont('times', 'bold');
    const bw = pdf.getTextWidth(boldPart + ' ');
    pdf.text(boldPart, x, y);
    pdf.setFont('times', 'normal');
    const valLines: string[] = pdf.splitTextToSize(normalPart, maxW - bw);
    if (valLines.length > 0) {
      pdf.text(valLines[0], x + bw, y);
      y += interline;
      for (let i = 1; i < valLines.length; i++) {
        checkPage();
        if (i < valLines.length - 1) {
          drawJustifiedLine(valLines[i], x, y, maxW);
        } else {
          pdf.text(valLines[i], x, y);
        }
        y += interline;
      }
    } else {
      y += interline;
    }
  };

  const addCenteredSection = (text: string) => {
    checkPage();
    pdf.setFont('times', 'bold');
    pdf.setFontSize(fontSize);
    pdf.text(text, pw / 2, y, { align: 'center' });
  };

  const addClauseTitle = (num: string, text: string) => {
    checkPage(12);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(fontSize);
    pdf.text(`${num}. ${text}`, ml, y);
  };

  // Resolve all clauses with dynamic data
  const c = {} as IPLegalClauses;
  for (const k of Object.keys(clauses) as Array<keyof IPLegalClauses>) {
    c[k] = resolveClause(clauses[k], d, language);
  }

  // Translate month if EN
  let monthOut = s(d.fecha_mes);
  if (language === 'en') {
    const idx = MONTHS_ES.indexOf(d.fecha_mes?.toLowerCase());
    if (idx >= 0) monthOut = MONTHS_EN[idx];
  }

  // === PAGE 1 ===
  y = 25.3;
  addCenteredSection(L.title);

  y = 48.5;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(fontSize);
  pdf.text(L.cityPrefix(s(d.fecha_dia), monthOut, s(d.fecha_anio)), ml, y);

  y = 64.0;
  addCenteredSection(L.reunidos);

  y += sectionSpace;
  addHangingParagraph(L.deUnaParte,
    L.parteIntervencionProductora(s(d.productora_nombre), s(d.productora_doc_tipo), s(d.productora_dni), s(d.productora_domicilio)));

  y += sectionSpace;
  addHangingParagraph(L.deOtraParte,
    L.parteIntervencionColaboradora(s(d.colaboradora_nombre), s(d.colaboradora_doc_tipo), s(d.colaboradora_dni), s(d.colaboradora_domicilio)));

  y += subItemSpace;
  addParagraph(L.ambasPartes);

  y += subItemSpace;
  addParagraph(L.capacidadLegal);

  y += subItemSpace;
  addCenteredSection(L.manifiestan);

  y += sectionSpace;
  const mI = (recordingType === 'album' || recordingType === 'fullAlbum') ? L.manifiestoIAlbum : L.manifiestoI;
  addNumberedHanging('I)', mI(recordingType === 'fullAlbum' ? s(d.album_titulo) : s(d.grabacion_titulo), s(d.productora_nombre_artistico)));

  y += sectionSpace;
  const mII = recordingType === 'fullAlbum'
    ? L.manifiestoIIFullAlbum
    : (recordingType === 'album' ? L.manifiestoIIAlbum : L.manifiestoII);
  addNumberedHanging('II)', mII);

  y += sectionSpace;
  addNumberedHanging('III)', L.manifiestoIII(s(d.colaboradora_nombre_artistico)));

  y += sectionSpace;
  addNumberedHanging('IV)', recordingType === 'fullAlbum' ? L.manifiestoIVFullAlbum : L.manifiestoIV);

  y += sectionSpace;
  addParagraph(L.paraAcordar, indent1);

  y += sectionSpace;
  addCenteredSection(L.clausulas);

  // 1. OBJETO
  y += subItemSpace;
  addClauseTitle('1', L.clauseTitles.objeto);

  y += sectionSpace;
  addParagraph(c.objeto_1_1, indent1);

  y += subItemSpace;
  if (recordingType === 'fullAlbum') {
    const sf = L.subItemsObjetoFullAlbum;
    const fechas = language === 'en'
      ? `from ${s(d.album_fecha_fijacion_desde)} to ${s(d.album_fecha_fijacion_hasta)}`
      : `desde ${s(d.album_fecha_fijacion_desde)} hasta ${s(d.album_fecha_fijacion_hasta)}`;
    const listadoLabel = language === 'en' ? 'According to attached Annex I' : 'Según Anexo I adjunto';
    addSubItem('a. ', sf.a, s(d.album_titulo));
    addSubItem('b. ', sf.b, s(d.album_num_grabaciones || (d.album_tracks.length ? String(d.album_tracks.length) : '')));
    addSubItem('c. ', sf.c, s(d.grabacion_calidad));
    addSubItem('d. ', sf.d, s(d.grabacion_caracter));
    addSubItem('e. ', sf.e, s(d.album_videoclips_si_no));
    addSubItem('f. ', sf.f, fechas);
    addSubItem('g. ', sf.g, listadoLabel);
  } else {
    addSubItem('a. ', L.subItemsObjeto.a, s(d.grabacion_titulo));
    addSubItem('b. ', L.subItemsObjeto.b, s(d.grabacion_calidad));
    addSubItem('c. ', L.subItemsObjeto.c, s(d.grabacion_duracion));
    addSubItem('d. ', L.subItemsObjeto.d, s(d.grabacion_videoclip));
    addSubItem('e. ', L.subItemsObjeto.e, s(d.grabacion_fecha_fijacion));
    addSubItem('f. ', L.subItemsObjeto.f, s(d.grabacion_caracter));
  }

  y += sectionSpace;
  addParagraph(c.objeto_1_2, indent1);

  // 2. ALCANCE
  y += sectionSpace;
  addClauseTitle('2', L.clauseTitles.alcance);

  y += sectionSpace;
  addParagraph(c.alcance_2_1, indent1);

  y += interline;
  addBoldInline(L.alcanceLetters.a, L.alcancePeriod);
  addBoldInline(L.alcanceLetters.b, L.alcanceTerritory);
  addBoldInline(L.alcanceLetters.c, L.alcanceMeans);

  y += subItemSpace;
  addParagraph(c.alcance_2_2, indent1);

  y += subItemSpace;
  addParagraph(c.alcance_2_3, indent1);

  y += subItemSpace;
  addSubItem('a. ', L.acreditacion.a, s(d.acreditacion_nombre));
  addSubItem('b. ', L.acreditacion.b, s(d.acreditacion_caracter));

  y += subItemSpace;
  addParagraph(c.alcance_2_4, indent1);

  y += subItemSpace;
  addParagraph(c.alcance_2_5, indent1);

  // 3. CONTRAPRESTACIÓN
  y += sectionSpace;
  addClauseTitle('3', L.clauseTitles.contraprestacion);

  y += sectionSpace;
  addParagraph(c.contraprestacion_3_1, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_2, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_3, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_4, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_5, indent1);

  // 4. NOTIFICACIONES
  y += sectionSpace;
  addClauseTitle('4', L.clauseTitles.notificaciones);

  y += sectionSpace;
  addParagraph(c.notificaciones_4_1, indent1);

  y += subItemSpace;
  addSubItem('a. ', L.notificacionesParts.a, s(d.productora_email));
  addSubItem('b. ', L.notificacionesParts.b, s(d.colaboradora_email));

  // 5. CONFIDENCIALIDAD
  y += sectionSpace;
  addClauseTitle('5', L.clauseTitles.confidencialidad);

  y += sectionSpace;
  addParagraph(c.confidencialidad_5_1, indent1);

  y += subItemSpace;
  addParagraph(c.confidencialidad_5_2, indent1);

  y += subItemSpace;
  addParagraph(c.confidencialidad_5_2b, indent1);

  // 6. LEY APLICABLE
  y += sectionSpace;
  addClauseTitle('6', L.clauseTitles.ley);

  y += sectionSpace;
  addParagraph(c.ley_6_1, indent1);

  y += subItemSpace;
  addParagraph(c.ley_6_2, indent1);

  // Closing
  y += sectionSpace;
  addParagraph(L.signOff);

  // Signature block
  checkPage(50);
  y += 15;
  const colW = (cw - 20) / 2;

  pdf.setFont('times', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text(L.signProducer, ml + colW / 2, y, { align: 'center' });
  pdf.text(L.signCollaborator, ml + colW + 20 + colW / 2, y, { align: 'center' });

  y += 25;
  pdf.setDrawColor(0);
  pdf.line(ml, y, ml + colW, y);
  pdf.line(ml + colW + 20, y, ml + colW + 20 + colW, y);

  y += 6;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(fontSize);
  pdf.text(s(d.firma_productora), ml + colW / 2, y, { align: 'center' });
  pdf.text(s(d.firma_colaboradora), ml + colW + 20 + colW / 2, y, { align: 'center' });

  addFooter();

  // === ANEXO I (Full Album only) ===
  if (recordingType === 'fullAlbum') {
    pdf.addPage();
    pageNum++;
    y = 30;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(14);
    pdf.text(L.annexTitle, pw / 2, y, { align: 'center' });
    y += 8;
    pdf.setFontSize(12);
    pdf.text(L.annexSubtitle, pw / 2, y, { align: 'center' });
    y += 14;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(fontSize);
    pdf.text(L.annexIntro, ml, y);
    y += 10;

    const tracks = d.album_tracks.length > 0 ? d.album_tracks : Array.from({ length: 5 }, () => ({ titulo: '', duracion: '' }));
    tracks.forEach((t, i) => {
      checkPage();
      const titleLabel = language === 'en' ? 'Title' : 'Título';
      const durLabel = language === 'en' ? 'Duration' : 'Duración';
      pdf.text(`${i + 1}. ${titleLabel}: ${s(t.titulo)} | ${durLabel}: ${s(t.duracion)}`, ml, y);
      y += interline + 1;
    });

    y += 8;
    checkPage(20);
    renderLines(L.annexClosing, ml, cw);

    // Signatures on annex
    checkPage(50);
    y += 18;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(fontSize);
    pdf.text(L.signProducer, ml + colW / 2, y, { align: 'center' });
    pdf.text(L.signCollaborator, ml + colW + 20 + colW / 2, y, { align: 'center' });
    y += 25;
    pdf.line(ml, y, ml + colW, y);
    pdf.line(ml + colW + 20, y, ml + colW + 20 + colW, y);
    y += 6;
    pdf.setFont('times', 'normal');
    pdf.text(s(d.firma_productora), ml + colW / 2, y, { align: 'center' });
    pdf.text(s(d.firma_colaboradora), ml + colW + 20 + colW / 2, y, { align: 'center' });

    addFooter();
  }

  return pdf;
}

export function IPLicenseGenerator({ open, onOpenChange, onSave, releaseId: externalReleaseId, draftId, onDraftSaved }: IPLicenseGeneratorProps) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<IPLicenseLanguage>('es');
  const [recordingType, setRecordingType] = useState<IPLicenseRecordingType>('single');
  const [formData, setFormData] = useState<FormData>({ ...defaultData });
  const [ipClauses, setIpClauses] = useState<IPLegalClauses>(getDefaultIPClauses('es', 'single'));
  const [manualTrack, setManualTrack] = useState(false);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>(externalReleaseId);
  const effectiveReleaseId = externalReleaseId || selectedReleaseId;
  const { data: releases = [] } = useReleases();
  const { data: tracks = [] } = useTracks(effectiveReleaseId);
  const { user } = useAuth();
  const { saveDraft, updateDraft, updateStatus } = useContractDrafts();
  const [currentDraft, setCurrentDraft] = useState<ContractDraft | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Load existing draft
  useEffect(() => {
    if (draftId && open) {
      (async () => {
        const { data } = await supabase
          .from('contract_drafts')
          .select('*')
          .eq('id', draftId)
          .single();
        if (data) {
          const d = data as unknown as ContractDraft;
          setCurrentDraft(d);
          if (d.form_data) setFormData(d.form_data as FormData);
          if (d.clauses_data) setIpClauses(d.clauses_data as IPLegalClauses);
          if (d.recording_type) setRecordingType(d.recording_type as IPLicenseRecordingType);
          if (d.language) setLanguage(d.language as IPLicenseLanguage);
        }
      })();
    }
  }, [draftId, open]);

  // Re-apply default clauses when language or recording type changes (only if user hasn't customized)
  useEffect(() => {
    setIpClauses(getDefaultIPClauses(language, recordingType));
  }, [language, recordingType]);

  // Auto-detect recording type from selected release
  const releaseType = effectiveReleaseId ? releases.find(x => x.id === effectiveReleaseId)?.type : undefined;
  const isAlbumRelease = releaseType === 'album' || releaseType === 'ep';
  useEffect(() => {
    if (!effectiveReleaseId) return;
    if (releaseType === 'single') {
      setRecordingType('single');
    } else if (isAlbumRelease) {
      // Default to 'album' but allow user to switch to 'fullAlbum'
      setRecordingType(prev => (prev === 'album' || prev === 'fullAlbum') ? prev : 'album');
    }
  }, [effectiveReleaseId, releaseType, isAlbumRelease]);

  // Auto-populate album_tracks from release tracks when fullAlbum
  useEffect(() => {
    if (recordingType !== 'fullAlbum') return;
    if (formData.album_tracks.length > 0) return;
    if (tracks.length === 0) return;
    setFormData(prev => ({
      ...prev,
      album_tracks: tracks.map(t => ({ titulo: t.title, duracion: t.duration ? formatDuration(t.duration) : '' })),
      album_num_grabaciones: prev.album_num_grabaciones || String(tracks.length),
      album_titulo: prev.album_titulo || (releases.find(r => r.id === effectiveReleaseId)?.title ?? ''),
    }));
  }, [recordingType, tracks, formData.album_tracks.length, effectiveReleaseId, releases]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      if (currentDraft) {
        await updateDraft(currentDraft.id, {
          formData,
          clausesData: ipClauses,
          title: `Licencia IP - ${formData.colaboradora_nombre_artistico || formData.colaboradora_nombre || 'Sin nombre'}`,
          recordingType,
          language,
        });
      } else {
        const draft = await saveDraft({
          draftType: 'ip_license',
          title: `Licencia IP - ${formData.colaboradora_nombre_artistico || formData.colaboradora_nombre || 'Sin nombre'}`,
          formData,
          clausesData: ipClauses,
          releaseId: effectiveReleaseId,
          producerEmail: formData.productora_email || undefined,
          collaboratorEmail: formData.colaboradora_email || undefined,
          recordingType,
          language,
        });
        if (draft) setCurrentDraft(draft);
      }
      onDraftSaved?.();
    } finally {
      setSavingDraft(false);
    }
  };

  const handleShareLink = async () => {
    if (!currentDraft) return;
    if (currentDraft.status === 'borrador') {
      await updateStatus(currentDraft.id, 'en_negociacion');
      setCurrentDraft({ ...currentDraft, status: 'en_negociacion' });
    }
    const url = `${PUBLIC_APP_URL}/contract-draft/${currentDraft.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Link de negociación copiado');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'colaboradora_nombre_artistico') {
        if (!prev.acreditacion_nombre || prev.acreditacion_nombre === prev.colaboradora_nombre_artistico) {
          next.acreditacion_nombre = value;
        }
      }
      if (field === 'grabacion_caracter') {
        if (!prev.acreditacion_caracter || prev.acreditacion_caracter === prev.grabacion_caracter) {
          next.acreditacion_caracter = value;
        }
      }
      if (field === 'productora_nombre') {
        if (!prev.firma_productora || prev.firma_productora === prev.productora_nombre) {
          next.firma_productora = value;
        }
      }
      if (field === 'colaboradora_nombre') {
        if (!prev.firma_colaboradora || prev.firma_colaboradora === prev.colaboradora_nombre) {
          next.firma_colaboradora = value;
        }
      }
      return next;
    });
  };

  const handleSelectPerson = (person: PersonData, target: 'productora' | 'colaboradora') => {
    setFormData(prev => {
      const next = { ...prev };
      const fullName = person.legal_name || person.name;
      next[`${target}_nombre`] = fullName;
      if (person.nif) next[`${target}_dni`] = person.nif;
      if (person.address) next[`${target}_domicilio`] = person.address;
      if (person.stage_name) next[`${target}_nombre_artistico`] = person.stage_name;
      if (person.email) next[`${target}_email`] = person.email;
      // Sync dependent fields
      if (target === 'productora') {
        if (!prev.firma_productora || prev.firma_productora === prev.productora_nombre) {
          next.firma_productora = fullName;
        }
      }
      if (target === 'colaboradora') {
        if (!prev.firma_colaboradora || prev.firma_colaboradora === prev.colaboradora_nombre) {
          next.firma_colaboradora = fullName;
        }
        if (!prev.acreditacion_nombre || prev.acreditacion_nombre === prev.colaboradora_nombre_artistico) {
          next.acreditacion_nombre = person.stage_name || '';
        }
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    const pdf = generatePDF(formData, ipClauses, language, recordingType);
    const blob = pdf.output('blob');
    
    if (onSave) {
      await onSave({
        title: `Licencia IP - ${formData.colaboradora_nombre_artistico || formData.colaboradora_nombre || 'Sin nombre'}`,
        content: `Licencia de Cesion de Derechos de Propiedad Intelectual - ${formData.titulo_sencillo}`,
        pdfBlob: blob,
      });
    } else {
      pdf.save(`Licencia_IP_${formData.titulo_sencillo || 'contrato'}.pdf`);
    }
    
    onOpenChange(false);
    setStep(0);
    setFormData({ ...defaultData });
    setIpClauses(getDefaultIPClauses(language, recordingType));
    if (!externalReleaseId) setSelectedReleaseId(undefined);
    setManualTrack(false);
  };

  const handlePreview = () => {
    const pdf = generatePDF(formData, ipClauses, language, recordingType);
    const blobUrl = URL.createObjectURL(pdf.output('blob'));
    window.open(blobUrl, '_blank');
  };

  const renderClausesStep = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Cláusulas del contrato</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIpClauses(getDefaultIPClauses(language, recordingType))}
          className="text-xs gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar predeterminadas
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Puedes editar el texto de cada cláusula. Los valores entre {'{{llaves}}'} se sustituirán automáticamente con los datos del formulario.</p>
      {IP_CLAUSE_SECTIONS.map((section) => (
        <Collapsible key={section.title}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50">
            {section.title}
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 pl-2">
            {section.fields.map((field) => (
              <div key={field.key}>
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Textarea
                  value={ipClauses[field.key]}
                  onChange={(e) => setIpClauses(prev => ({ ...prev, [field.key]: e.target.value }))}
                  rows={4}
                  className="text-xs mt-1"
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/40">
              <div>
                <Label className="text-xs">Idioma / Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as IPLicenseLanguage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo / Type</Label>
                <Select
                  value={recordingType}
                  onValueChange={(v) => setRecordingType(v as IPLicenseRecordingType)}
                  disabled={releaseType === 'single'}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single" disabled={isAlbumRelease}>Single</SelectItem>
                    <SelectItem value="album" disabled={releaseType === 'single'}>Álbum (canción individual)</SelectItem>
                    <SelectItem value="fullAlbum" disabled={releaseType === 'single'}>Álbum completo (todas las canciones)</SelectItem>
                  </SelectContent>
                </Select>
                {effectiveReleaseId && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {releaseType === 'single'
                      ? 'Tipo determinado por el lanzamiento (Single)'
                      : 'El lanzamiento permite Álbum o Álbum completo'}
                  </p>
                )}
              </div>
            </div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Datos de la Productora</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Día</Label><Input value={formData.fecha_dia} onChange={e => update('fecha_dia', e.target.value)} placeholder="15" /></div>
              <div><Label>Mes</Label><Input value={formData.fecha_mes} onChange={e => update('fecha_mes', e.target.value)} placeholder="enero" /></div>
              <div><Label>Año</Label><Input value={formData.fecha_anio} onChange={e => update('fecha_anio', e.target.value)} /></div>
            </div>
            <div><Label>Nombre completo</Label><PersonSearchInput value={formData.productora_nombre} onChange={v => update('productora_nombre', v)} onSelect={p => handleSelectPerson(p, 'productora')} placeholder="Buscar o escribir nombre..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo documento</Label>
                <Select value={formData.productora_doc_tipo} onValueChange={v => update('productora_doc_tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="NIE">NIE</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Número de {formData.productora_doc_tipo}</Label>
                <Input value={formData.productora_dni} onChange={e => update('productora_dni', e.target.value)} placeholder={`Número de ${formData.productora_doc_tipo}`} />
              </div>
            </div>
            <div><Label>Domicilio</Label><Input value={formData.productora_domicilio} onChange={e => update('productora_domicilio', e.target.value)} /></div>
            <div><Label>Nombre artístico</Label><Input value={formData.productora_nombre_artistico} onChange={e => update('productora_nombre_artistico', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.productora_email} onChange={e => update('productora_email', e.target.value)} /></div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Datos del Colaborador/a</h3>
            <div><Label>Nombre completo</Label><PersonSearchInput value={formData.colaboradora_nombre} onChange={v => update('colaboradora_nombre', v)} onSelect={p => handleSelectPerson(p, 'colaboradora')} placeholder="Buscar o escribir nombre..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo documento</Label>
                <Select value={formData.colaboradora_doc_tipo} onValueChange={v => update('colaboradora_doc_tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="NIE">NIE</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Número de {formData.colaboradora_doc_tipo}</Label>
                <Input value={formData.colaboradora_dni} onChange={e => update('colaboradora_dni', e.target.value)} placeholder={`Número de ${formData.colaboradora_doc_tipo}`} />
              </div>
            </div>
            <div><Label>Domicilio</Label><Input value={formData.colaboradora_domicilio} onChange={e => update('colaboradora_domicilio', e.target.value)} /></div>
            <div><Label>Nombre artístico</Label><Input value={formData.colaboradora_nombre_artistico} onChange={e => update('colaboradora_nombre_artistico', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.colaboradora_email} onChange={e => update('colaboradora_email', e.target.value)} /></div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Grabación y Derechos</h3>
            {!externalReleaseId && (
              <div>
                <Label>Lanzamiento</Label>
                <Select
                  value={selectedReleaseId || ''}
                  onValueChange={(v) => {
                    setSelectedReleaseId(v === '__none__' ? undefined : v);
                    setManualTrack(false);
                    update('grabacion_titulo', '');
                    update('titulo_sencillo', '');
                    update('grabacion_duracion', '');
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un lanzamiento (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin lanzamiento</SelectItem>
                    {releases.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title} ({r.type === 'album' ? 'Álbum' : r.type === 'ep' ? 'EP' : 'Single'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {recordingType !== 'fullAlbum' && (<>
            <div><Label>Título de la Grabación</Label>
              {tracks.length > 0 && !manualTrack ? (
                <Select
                  value={formData.grabacion_titulo}
                  onValueChange={(v) => {
                    if (v === '__other__') {
                      setManualTrack(true);
                      update('grabacion_titulo', '');
                      update('titulo_sencillo', '');
                      update('grabacion_duracion', '');
                      return;
                    }
                    const track = tracks.find(t => t.title === v);
                    update('grabacion_titulo', v);
                    update('titulo_sencillo', v);
                    if (track && track.duration) {
                      update('grabacion_duracion', formatDuration(track.duration));
                    } else if (track) {
                      // Fallback: extract duration from audio file
                      (async () => {
                        try {
                          const { data: versions } = await supabase
                            .from('track_versions')
                            .select('file_url')
                            .eq('track_id', track.id)
                            .order('created_at', { ascending: false })
                            .limit(1);
                          if (versions?.[0]?.file_url) {
                            const audio = new Audio(versions[0].file_url);
                            audio.addEventListener('loadedmetadata', async () => {
                              const dur = Math.round(audio.duration);
                              if (dur && isFinite(dur)) {
                                update('grabacion_duracion', formatDuration(dur));
                                await supabase.from('tracks').update({ duration: dur }).eq('id', track.id);
                              }
                            });
                            audio.load();
                          }
                        } catch (e) {
                          console.warn('Could not extract track duration:', e);
                        }
                      })();
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un track" /></SelectTrigger>
                  <SelectContent>
                    {tracks.map(t => (
                      <SelectItem key={t.id} value={t.title}>{t.track_number}. {t.title}{t.duration ? ` (${formatDuration(t.duration)})` : ''}</SelectItem>
                    ))}
                    <SelectItem value="__other__">Otro (escribir manualmente)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input value={formData.grabacion_titulo} onChange={e => { update('grabacion_titulo', e.target.value); update('titulo_sencillo', e.target.value); }} placeholder="Título de la grabación" className="flex-1" />
                  {tracks.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setManualTrack(false)}>Tracks</Button>
                  )}
                </div>
              )}
            </div>
            <div><Label>Calidad de intervención</Label>
              <Select value={formData.grabacion_calidad} onValueChange={v => update('grabacion_calidad', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="músico intérprete">Músico intérprete</SelectItem>
                  <SelectItem value="músico ejecutante">Músico ejecutante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duración</Label><Input value={formData.grabacion_duracion} onChange={e => update('grabacion_duracion', e.target.value)} placeholder="MM:SS" /></div>
            <div><Label>Videoclip</Label>
              <Select value={formData.grabacion_videoclip} onValueChange={v => update('grabacion_videoclip', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sí">Sí</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fecha de fijación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.grabacion_fecha_fijacion && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.grabacion_fecha_fijacion || "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.grabacion_fecha_fijacion ? parse(formData.grabacion_fecha_fijacion, 'dd/MM/yyyy', new Date()) : undefined}
                    onSelect={(date) => { if (date) update('grabacion_fecha_fijacion', format(date, 'dd/MM/yyyy')); }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            </>)}
            {recordingType === 'fullAlbum' && (
              <div className="space-y-3 p-3 rounded-md border bg-muted/20">
                <p className="text-xs text-muted-foreground">La COLABORADORA participa en TODAS las canciones del Álbum con el mismo rol y porcentaje.</p>
                <div><Label>Título del Álbum</Label><Input value={formData.album_titulo} onChange={e => update('album_titulo', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nº de grabaciones</Label><Input type="number" value={formData.album_num_grabaciones} onChange={e => update('album_num_grabaciones', e.target.value)} /></div>
                  <div><Label>Videoclips (Sí/No)</Label>
                    <Select value={formData.album_videoclips_si_no} onValueChange={v => update('album_videoclips_si_no', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sí">Sí</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha fijación desde</Label><Input value={formData.album_fecha_fijacion_desde} onChange={e => update('album_fecha_fijacion_desde', e.target.value)} placeholder="dd/mm/aaaa" /></div>
                  <div><Label>Fecha fijación hasta</Label><Input value={formData.album_fecha_fijacion_hasta} onChange={e => update('album_fecha_fijacion_hasta', e.target.value)} placeholder="dd/mm/aaaa" /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Listado de grabaciones (Anexo I)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData(p => ({ ...p, album_tracks: [...p.album_tracks, { titulo: '', duracion: '' }] }))}>+ Añadir</Button>
                  </div>
                  <div className="space-y-2">
                    {formData.album_tracks.map((t, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                        <Input className="flex-1" placeholder="Título" value={t.titulo} onChange={e => setFormData(p => ({ ...p, album_tracks: p.album_tracks.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x) }))} />
                        <Input className="w-24" placeholder="MM:SS" value={t.duracion} onChange={e => setFormData(p => ({ ...p, album_tracks: p.album_tracks.map((x, j) => j === i ? { ...x, duracion: e.target.value } : x) }))} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, album_tracks: p.album_tracks.filter((_, j) => j !== i) }))}>×</Button>
                      </div>
                    ))}
                    {formData.album_tracks.length === 0 && <p className="text-xs text-muted-foreground">No hay grabaciones. Selecciona un lanzamiento para autopoblar o añade manualmente.</p>}
                  </div>
                </div>
              </div>
            )}
            <div><Label>Carácter de la intervención</Label>
              <Select value={formData.grabacion_caracter} onValueChange={v => update('grabacion_caracter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main artist">Main artist</SelectItem>
                  <SelectItem value="featured artist">Featured artist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nombre para acreditación</Label><Input value={formData.acreditacion_nombre} onChange={e => update('acreditacion_nombre', e.target.value)} /></div>
              <div><Label>Carácter para acreditación</Label><Input value={formData.acreditacion_caracter} onChange={e => update('acreditacion_caracter', e.target.value)} placeholder="featured artist" /></div>
            </div>
            <div>
              <Label>Royalty (%)</Label>
              <div className="flex items-center gap-3">
                <Input type="number" min="0" max="100" value={formData.royalty_porcentaje} onChange={e => update('royalty_porcentaje', e.target.value)} className="w-24" />
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {numberToSpanishText(parseInt(formData.royalty_porcentaje) || 0) || '—'} POR CIENTO
                </Badge>
              </div>
            </div>
          </div>
        );
      case 3:
        return renderClausesStep();
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Vista Previa y Firmas</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Productora:</strong> {formData.productora_nombre} ({formData.productora_nombre_artistico})</p>
              <p><strong>Colaborador/a:</strong> {formData.colaboradora_nombre} ({formData.colaboradora_nombre_artistico})</p>
              <p><strong>Grabación (Sencillo):</strong> {formData.grabacion_titulo} - {formData.grabacion_duracion}</p>
              <p><strong>Royalty:</strong> {formData.royalty_porcentaje}% ({numberToSpanishText(parseInt(formData.royalty_porcentaje) || 0)})</p>
            </div>
            <div><Label>Nombre firma Productora</Label><Input value={formData.firma_productora} onChange={e => update('firma_productora', e.target.value)} /></div>
            <div><Label>Nombre firma Colaboradora</Label><Input value={formData.firma_colaboradora} onChange={e => update('firma_colaboradora', e.target.value)} /></div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setStep(0); setCurrentDraft(null); } }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Licencia de Propiedad Intelectual</DialogTitle>
            {currentDraft && <DraftStatusBanner status={currentDraft.status} />}
          </div>
          <div className="flex gap-1 mt-2">
            {STEPS.map((label, i) => (
              <div key={label} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Paso {step + 1} de {STEPS.length}: {STEPS[step]}</p>
        </DialogHeader>

        {renderStep()}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          <div className="flex gap-2 flex-wrap justify-end">
            {step === STEPS.length - 1 && (
              <>
                <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                  <Save className="h-4 w-4 mr-1" />
                  {currentDraft ? 'Actualizar borrador' : 'Guardar borrador'}
                </Button>
                {currentDraft && (
                  <Button variant="outline" onClick={handleShareLink}>
                    {copiedLink ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
                    {copiedLink ? 'Copiado' : 'Compartir link'}
                  </Button>
                )}
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-1" />
                  Vista previa
                </Button>
                <Button onClick={handleGenerate} disabled={currentDraft?.status === 'en_negociacion'}>
                  <Download className="h-4 w-4 mr-1" />
                  Generar PDF
                </Button>
              </>
            )}
            {step < STEPS.length - 1 && (
              <Button onClick={() => setStep(step + 1)}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
