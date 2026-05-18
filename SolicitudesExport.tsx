import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Solicitud {
  id: string;
  tipo: string;
  nombre_solicitante: string;
  email?: string;
  estado: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_limite_respuesta?: string;
  medio?: string;
  nombre_programa?: string;
  nombre_festival?: string;
  ciudad?: string;
  descripcion_libre?: string;
  observaciones?: string;
  notas_internas?: string;
  comentario_estado?: string;
}

interface SolicitudesExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudes: Solicitud[];
}

const COLUMN_OPTIONS = [
  { key: 'tipo', label: 'Tipo', default: true },
  { key: 'nombre_solicitante', label: 'Nombre/Asunto', default: true },
  { key: 'estado', label: 'Estado', default: true },
  { key: 'fecha_creacion', label: 'Fecha Creación', default: true },
  { key: 'fecha_limite_respuesta', label: 'Fecha Límite', default: true },
  { key: 'email', label: 'Email', default: false },
  { key: 'medio', label: 'Medio', default: false },
  { key: 'nombre_programa', label: 'Programa', default: false },
  { key: 'nombre_festival', label: 'Festival', default: false },
  { key: 'ciudad', label: 'Ciudad', default: false },
  { key: 'descripcion_libre', label: 'Descripción', default: false },
  { key: 'observaciones', label: 'Observaciones', default: false },
  { key: 'notas_internas', label: 'Notas Internas', default: false },
  { key: 'comentario_estado', label: 'Comentario Decisión', default: false },
];

export function SolicitudesExport({ open, onOpenChange, solicitudes }: SolicitudesExportProps) {
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    COLUMN_OPTIONS.filter(c => c.default).map(c => c.key)
  );
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pendiente' | 'aprobada' | 'denegada'>('all');

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getFilteredSolicitudes = () => {
    let filtered = [...solicitudes];

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.estado === filterStatus);
    }

    // Filtro por fecha
    const now = new Date();
    switch (dateRange) {
      case '7days':
        filtered = filtered.filter(s => new Date(s.fecha_creacion) >= subDays(now, 7));
        break;
      case '30days':
        filtered = filtered.filter(s => new Date(s.fecha_creacion) >= subDays(now, 30));
        break;
      case 'month':
        filtered = filtered.filter(s => {
          const created = new Date(s.fecha_creacion);
          return created >= startOfMonth(now) && created <= endOfMonth(now);
        });
        break;
      case 'custom':
        if (customStart) {
          filtered = filtered.filter(s => new Date(s.fecha_creacion) >= customStart);
        }
        if (customEnd) {
          filtered = filtered.filter(s => new Date(s.fecha_creacion) <= customEnd);
        }
        break;
    }

    return filtered;
  };

  const exportToExcel = () => {
    const filtered = getFilteredSolicitudes();
    
    // BOM para compatibilidad Excel
    const BOM = '\uFEFF';
    
    // Headers
    const headers = selectedColumns.map(key => 
      COLUMN_OPTIONS.find(c => c.key === key)?.label || key
    );
    
    // Data rows
    const rows = filtered.map(s => {
      return selectedColumns.map(key => {
        let value = (s as any)[key];
        if (value === null || value === undefined) return '';
        if (key.includes('fecha') && value) {
          try {
            return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es });
          } catch {
            return value;
          }
        }
        return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
      });
    });
    
    const content = BOM + [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solicitudes_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exportación completada',
      description: `Se han exportado ${filtered.length} solicitudes a Excel`,
    });
    onOpenChange(false);
  };

  const exportToPDF = () => {
    const filtered = getFilteredSolicitudes();
    const doc = new jsPDF('landscape');
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Solicitudes', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, 14, 30);
    doc.text(`Total: ${filtered.length} solicitudes`, 14, 36);
    
    // Headers
    const headers = selectedColumns.map(key => 
      COLUMN_OPTIONS.find(c => c.key === key)?.label || key
    );
    
    // Data
    const data = filtered.map(s => {
      return selectedColumns.map(key => {
        let value = (s as any)[key];
        if (value === null || value === undefined) return '-';
        if (key.includes('fecha') && value) {
          try {
            return format(new Date(value), 'dd/MM/yy', { locale: es });
          } catch {
            return value;
          }
        }
        // Truncar textos largos
        const str = String(value);
        return str.length > 30 ? str.substring(0, 27) + '...' : str;
      });
    });
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    
    // Resumen
    const pendientes = filtered.filter(s => s.estado === 'pendiente').length;
    const aprobadas = filtered.filter(s => s.estado === 'aprobada').length;
    const denegadas = filtered.filter(s => s.estado === 'denegada').length;
    
    const finalY = (doc as any).lastAutoTable?.finalY || 50;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Resumen: ${pendientes} pendientes | ${aprobadas} aprobadas | ${denegadas} denegadas`, 14, finalY + 10);
    
    doc.save(`solicitudes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: 'PDF generado',
      description: `Se han exportado ${filtered.length} solicitudes a PDF`,
    });
    onOpenChange(false);
  };

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  const filteredCount = getFilteredSolicitudes().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Solicitudes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato de exportación */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Formato</Label>
            <div className="flex gap-2">
              <Button
                variant={exportFormat === 'excel' ? 'default' : 'outline'}
                onClick={() => setExportFormat('excel')}
                className="flex-1 gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                onClick={() => setExportFormat('pdf')}
                className="flex-1 gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* Filtro por estado */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Estado</Label>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Solo pendientes</SelectItem>
                <SelectItem value="aprobada">Solo aprobadas</SelectItem>
                <SelectItem value="denegada">Solo denegadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rango de fechas */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Período</Label>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="30days">Últimos 30 días</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === 'custom' && (
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {customStart ? format(customStart, 'dd/MM/yyyy') : 'Desde'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Hasta'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Columnas a exportar */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Columnas a incluir</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {COLUMN_OPTIONS.map(col => (
                <div key={col.key} className="flex items-center gap-2">
                  <Checkbox
                    id={col.key}
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <label htmlFor={col.key} className="text-sm cursor-pointer">
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview count */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            Se exportarán <span className="font-medium text-foreground">{filteredCount}</span> solicitudes
            con <span className="font-medium text-foreground">{selectedColumns.length}</span> columnas
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={filteredCount === 0 || selectedColumns.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar {exportFormat === 'excel' ? 'Excel' : 'PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
