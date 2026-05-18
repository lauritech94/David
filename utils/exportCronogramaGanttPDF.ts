import jsPDF from 'jspdf';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface GanttExportTask {
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
}

interface GanttExportWorkflow {
  id: string;
  name: string;
  tasks: GanttExportTask[];
}

const WORKFLOW_COLORS: Record<string, [number, number, number]> = {
  audio: [59, 130, 246],
  visual: [236, 72, 153],
  fabricacion: [234, 179, 8],
  contenido: [168, 85, 247],
  marketing: [249, 115, 22],
  directo: [34, 197, 94],
};

const STATUS_COLORS: Record<TaskStatus, [number, number, number]> = {
  pendiente: [156, 163, 175], // gris
  en_proceso: [59, 130, 246], // azul
  completado: [34, 197, 94],  // verde
  retrasado: [239, 68, 68],   // rojo
};

export function exportCronogramaGanttPDF(
  workflows: GanttExportWorkflow[],
  releaseName: string,
  artistName?: string,
  releaseDate?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // ~297
  const pageH = doc.internal.pageSize.getHeight(); // ~210

  const marginLeft = 10;
  const marginRight = 10;
  const taskColWidth = 75; // left column for task names
  const timelineLeft = marginLeft + taskColWidth;
  const timelineRight = pageW - marginRight;
  const timelineWidth = timelineRight - timelineLeft;
  const rowHeight = 7;
  const workflowHeaderHeight = 9;
  const headerAreaHeight = 38; // space for title + month headers

  // --- Compute date range ---
  const today = startOfDay(new Date());
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const wf of workflows) {
    for (const t of wf.tasks) {
      if (!t.startDate) continue;
      const start = startOfDay(t.startDate);
      const end = addDays(start, Math.max(t.estimatedDays, 1));
      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    }
  }

  if (!minDate || !maxDate) {
    // No tasks with dates — fallback to table export message
    doc.setFontSize(14);
    doc.text('No hay tareas con fechas asignadas para generar el cronograma visual.', 14, 30);
    const safeName = releaseName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').trim().replace(/\s+/g, '_');
    doc.save(`cronograma_gantt_${safeName}.pdf`);
    return;
  }

  // Add padding: start at beginning of minDate's month, end at end of maxDate's month
  const rangeStart = startOfMonth(minDate);
  const rangeEnd = endOfMonth(maxDate);
  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
  const pxPerDay = timelineWidth / totalDays;

  // Months in range
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

  // --- Helper: date to X position ---
  function dateToX(date: Date): number {
    const dayOffset = differenceInDays(startOfDay(date), rangeStart);
    return timelineLeft + dayOffset * pxPerDay;
  }

  // --- Draw page header & timeline header ---
  function drawPageHeader(startY: number): number {
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Cronograma', marginLeft, startY + 6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(releaseName, marginLeft, startY + 13);

    let infoY = startY + 13;
    if (artistName) {
      infoY += 5;
      doc.text(`Artista: ${artistName}`, marginLeft, infoY);
    }
    if (releaseDate) {
      infoY += 5;
      doc.text(`Lanzamiento: ${releaseDate}`, marginLeft, infoY);
    }

    // Export date
    doc.setFontSize(8);
    doc.text(
      `Exportado: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`,
      pageW - marginRight,
      startY + 6,
      { align: 'right' },
    );

    // Month headers
    const monthHeaderY = startY + 26;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);

    for (const month of months) {
      const x = dateToX(month);
      const monthEnd = endOfMonth(month);
      const endX = dateToX(monthEnd);
      const width = endX - x;

      // Month background
      doc.setFillColor(245, 245, 245);
      doc.rect(x, monthHeaderY - 4, width, 7, 'F');

      // Month border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(x, monthHeaderY - 4, x, monthHeaderY + 3);

      // Month label
      const label = format(month, 'MMM yyyy', { locale: es });
      if (width > 12) {
        doc.text(label.charAt(0).toUpperCase() + label.slice(1), x + 1.5, monthHeaderY);
      }
    }

    // Bottom line of header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, monthHeaderY + 3, pageW - marginRight, monthHeaderY + 3);

    // Column header
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text('TAREA', marginLeft + 2, monthHeaderY);

    return monthHeaderY + 5;
  }

  // --- Draw today line ---
  function drawTodayLine(yStart: number, yEnd: number) {
    if (today >= rangeStart && today <= rangeEnd) {
      const x = dateToX(today);
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.line(x, yStart, x, yEnd);
      doc.setLineDashPattern([], 0);

      // "Hoy" label
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('Hoy', x - 1, yStart - 0.5);
    }
  }

  // --- Draw vertical grid lines (light, for each month) ---
  function drawGrid(yStart: number, yEnd: number) {
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    for (const month of months) {
      const x = dateToX(month);
      doc.line(x, yStart, x, yEnd);
    }
  }

  // --- Render ---
  let curY = drawPageHeader(8);
  const contentTopY = curY;

  // Collect all rows to draw, then paginate
  interface DrawRow {
    type: 'workflow' | 'task';
    workflowId?: string;
    workflowName?: string;
    completed?: number;
    total?: number;
    task?: GanttExportTask;
    color: [number, number, number];
  }

  const rows: DrawRow[] = [];
  for (const wf of workflows) {
    if (wf.tasks.length === 0) continue;
    const color = WORKFLOW_COLORS[wf.id] || [100, 100, 100];
    const completed = wf.tasks.filter(t => t.status === 'completado').length;
    rows.push({
      type: 'workflow',
      workflowId: wf.id,
      workflowName: wf.name,
      completed,
      total: wf.tasks.length,
      color,
    });
    for (const task of wf.tasks) {
      rows.push({ type: 'task', task, color });
    }
  }

  let gridStartY = curY;
  let pageStarted = true;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const neededHeight = row.type === 'workflow' ? workflowHeaderHeight : rowHeight;

    // Check page break
    if (curY + neededHeight > pageH - 10) {
      // Draw grid and today line for current page
      drawGrid(gridStartY, curY);
      drawTodayLine(gridStartY, curY);

      doc.addPage();
      curY = drawPageHeader(8);
      gridStartY = curY;
      pageStarted = true;
    }

    if (row.type === 'workflow') {
      // Workflow header row
      const [r, g, b] = row.color;

      // Subtle background
      doc.setFillColor(r, g, b);
      // Use lighter color to simulate opacity
      doc.setFillColor(
        Math.min(255, r + Math.round((255 - r) * 0.88)),
        Math.min(255, g + Math.round((255 - g) * 0.88)),
        Math.min(255, b + Math.round((255 - b) * 0.88)),
      );
      doc.rect(marginLeft, curY, pageW - marginLeft - marginRight, workflowHeaderHeight, 'F');

      // Color bar on left
      doc.setFillColor(r, g, b);
      doc.rect(marginLeft, curY, 2.5, workflowHeaderHeight, 'F');

      // Workflow name
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r, g, b);
      doc.text(
        `${row.workflowName}  (${row.completed}/${row.total})`,
        marginLeft + 5,
        curY + workflowHeaderHeight / 2 + 1.5,
      );

      doc.setTextColor(0);
      curY += workflowHeaderHeight;
    } else if (row.type === 'task' && row.task) {
      const task = row.task;
      const [r, g, b] = row.color;

      // Alternating row bg
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(marginLeft, curY, pageW - marginLeft - marginRight, rowHeight, 'F');
      }

      // Task name (truncated)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const maxNameWidth = taskColWidth - 8;
      let displayName = task.name;
      while (doc.getTextWidth(displayName) > maxNameWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== task.name) displayName += '…';
      doc.text(displayName, marginLeft + 4, curY + rowHeight / 2 + 1.2);

      // Draw bar if task has dates
      if (task.startDate) {
        const barStart = dateToX(startOfDay(task.startDate));
        const barEnd = dateToX(addDays(startOfDay(task.startDate), Math.max(task.estimatedDays, 1)));
        const barY = curY + 1.5;
        const barH = rowHeight - 3;
        const barW = Math.max(barEnd - barStart, 1.5);

        // Bar color based on status (matches legend)
        const [sr, sg, sb] = STATUS_COLORS[task.status];
        doc.setFillColor(sr, sg, sb);

        // Rounded rect (manual with small radius)
        const radius = 1.2;
        doc.roundedRect(barStart, barY, barW, barH, radius, radius, 'F');

        // Completed stripe pattern
        if (task.status === 'completado') {
          doc.setFillColor(255, 255, 255);
          // Small checkmark-like indicator at end of bar
          doc.setFontSize(5);
          doc.setTextColor(255, 255, 255);
          if (barW > 6) {
            doc.text('✓', barStart + barW - 3.5, barY + barH - 0.8);
          }
        }

        // Retrasado: red border
        if (task.status === 'retrasado') {
          doc.setDrawColor(239, 68, 68);
          doc.setLineWidth(0.3);
          doc.roundedRect(barStart, barY, barW, barH, radius, radius, 'S');
        }

        // Date labels on the RIGHT side of the bar
        const startLabel = format(task.startDate, 'd MMM', { locale: es });
        const endDate = addDays(task.startDate, task.estimatedDays);
        const endLabel = format(endDate, 'd MMM', { locale: es });
        const dateText = `${startLabel} – ${endLabel}`;

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);

        const dateTextWidth = doc.getTextWidth(dateText);
        const dateX = barStart + barW + 2;

        // Only draw date label if it fits within timeline area
        if (dateX + dateTextWidth < timelineRight) {
          doc.text(dateText, dateX, barY + barH - 0.5);
        } else {
          // Draw inside bar if it fits, or to the left
          if (barW > dateTextWidth + 4) {
            doc.setTextColor(255, 255, 255);
            doc.text(dateText, barStart + 2, barY + barH - 0.5);
          } else {
            // Draw to the left of bar
            doc.setTextColor(130, 130, 130);
            doc.text(dateText, barStart - dateTextWidth - 1, barY + barH - 0.5);
          }
        }
      } else {
        // No dates: show dash
        doc.setFontSize(6);
        doc.setTextColor(180, 180, 180);
        doc.text('Sin fechas', timelineLeft + 4, curY + rowHeight / 2 + 1);
      }

      // Responsible on far right (small)
      if (task.responsible) {
        doc.setFontSize(5);
        doc.setTextColor(160, 160, 160);
        doc.text(task.responsible, pageW - marginRight - 1, curY + rowHeight / 2 + 1, { align: 'right' });
      }

      doc.setTextColor(0);
      curY += rowHeight;
    }
  }

  // Final grid + today line
  drawGrid(gridStartY, curY);
  drawTodayLine(gridStartY, curY);

  // Status legend at bottom
  if (curY + 12 < pageH - 10) {
    curY += 6;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    const legends: { label: string; color: [number, number, number] }[] = [
      { label: 'Pendiente', color: [156, 163, 175] },
      { label: 'En Proceso', color: [59, 130, 246] },
      { label: 'Completado', color: [34, 197, 94] },
      { label: 'Retrasado', color: [239, 68, 68] },
    ];

    let legendX = marginLeft;
    for (const leg of legends) {
      doc.setFillColor(leg.color[0], leg.color[1], leg.color[2]);
      doc.roundedRect(legendX, curY, 3, 2.5, 0.5, 0.5, 'F');
      doc.setTextColor(100, 100, 100);
      doc.text(leg.label, legendX + 4, curY + 2);
      legendX += doc.getTextWidth(leg.label) + 8;
    }
  }

  // Save
  const safeName = releaseName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`cronograma_gantt_${safeName}.pdf`);
}
