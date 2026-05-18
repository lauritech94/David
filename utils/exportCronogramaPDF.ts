import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface ExportTask {
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  subtasks?: { name: string; type: string; status?: TaskStatus; completed?: boolean }[];
}

interface ExportWorkflow {
  id: string;
  name: string;
  tasks: ExportTask[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  completado: 'Completado',
  retrasado: 'Retrasado',
};

const STATUS_COLORS: Record<TaskStatus, [number, number, number]> = {
  pendiente: [156, 163, 175],
  en_proceso: [59, 130, 246],
  completado: [34, 197, 94],
  retrasado: [239, 68, 68],
};

const WORKFLOW_COLORS: Record<string, [number, number, number]> = {
  audio: [59, 130, 246],
  visual: [236, 72, 153],
  fabricacion: [234, 179, 8],
  contenido: [168, 85, 247],
  marketing: [249, 115, 22],
  directo: [34, 197, 94],
};

export function exportCronogramaPDF(
  workflows: ExportWorkflow[],
  releaseName: string,
  artistName?: string,
  releaseDate?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.text('Cronograma', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(releaseName, 14, 28);
  
  let headerY = 28;
  if (artistName) {
    headerY += 7;
    doc.text(`Artista: ${artistName}`, 14, headerY);
  }
  if (releaseDate) {
    headerY += 7;
    doc.text(`Fecha de lanzamiento: ${releaseDate}`, 14, headerY);
  }

  // Date
  doc.setFontSize(9);
  doc.text(`Exportado: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, pageWidth - 14, 20, { align: 'right' });

  doc.setTextColor(0);
  let yPosition = headerY + 12;

  // Progress summary
  const totalTasks = workflows.reduce((s, w) => s + w.tasks.length, 0);
  const completedTasks = workflows.reduce((s, w) => s + w.tasks.filter(t => t.status === 'completado').length, 0);
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  doc.setFontSize(10);
  doc.text(`Progreso general: ${completedTasks}/${totalTasks} tareas completadas (${progressPct}%)`, 14, yPosition);
  yPosition += 10;

  // Each workflow as a section
  for (const workflow of workflows) {
    if (workflow.tasks.length === 0) continue;

    const wfCompleted = workflow.tasks.filter(t => t.status === 'completado').length;
    const wfTotal = workflow.tasks.length;
    const color = WORKFLOW_COLORS[workflow.id] || [100, 100, 100];

    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      yPosition = 20;
    }

    // Workflow header
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(14, yPosition - 4, 3, 7, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${workflow.name}  (${wfCompleted}/${wfTotal})`, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;

    // Tasks table
    const tableData = workflow.tasks.map(task => {
      const start = task.startDate
        ? format(task.startDate, 'dd/MM/yyyy', { locale: es })
        : '—';
      const end = task.startDate
        ? format(addDays(task.startDate, task.estimatedDays), 'dd/MM/yyyy', { locale: es })
        : '—';
      return [
        task.name,
        task.responsible || '—',
        start,
        end,
        `${task.estimatedDays}d`,
        STATUS_LABELS[task.status],
      ];
    });

    autoTable(doc, {
      head: [['Tarea', 'Responsable', 'Inicio', 'Fin', 'Días', 'Estado']],
      body: tableData,
      startY: yPosition,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: color, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 45 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 28 },
      },
      didParseCell: (data: any) => {
        // Color the status cell
        if (data.section === 'body' && data.column.index === 5) {
          const statusValue = Object.entries(STATUS_LABELS).find(
            ([, label]) => label === data.cell.raw
          );
          if (statusValue) {
            const sc = STATUS_COLORS[statusValue[0] as TaskStatus];
            data.cell.styles.textColor = sc;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Save
  const safeName = releaseName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`cronograma_${safeName}.pdf`);
}
