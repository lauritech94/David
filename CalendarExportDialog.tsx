import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Printer, Download, FileDown } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  location: string | null;
  artist_id: string;
}

interface CalendarExportDialogProps {
  events: Event[];
}

export function CalendarExportDialog({ events }: CalendarExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<'download' | 'print' | 'csv'>('download');
  const [timeRange, setTimeRange] = useState<'past' | 'future'>('future');
  const [monthsCount, setMonthsCount] = useState(3);

  const getFilteredEvents = () => {
    const now = new Date();
    const startDate = timeRange === 'past' 
      ? subMonths(now, monthsCount) 
      : now;
    const endDate = timeRange === 'past' 
      ? now 
      : addMonths(now, monthsCount);

    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= startDate && eventDate <= endDate;
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  };

  const generateCSV = () => {
    const filteredEvents = getFilteredEvents();
    const headers = ['Título', 'Inicio', 'Fin', 'Ubicación', 'Tipo', 'Descripción'];
    const rows = filteredEvents.map(event => [
      event.title,
      format(new Date(event.start_date), 'yyyy-MM-dd HH:mm', { locale: es }),
      format(new Date(event.end_date), 'yyyy-MM-dd HH:mm', { locale: es }),
      event.location || '',
      event.event_type,
      event.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `calendario_${timeRange === 'past' ? 'ultimos' : 'proximos'}_${monthsCount}_meses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpen(false);
  };

  const generatePDF = () => {
    const filteredEvents = getFilteredEvents();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendario - ${timeRange === 'past' ? 'Últimos' : 'Próximos'} ${monthsCount} meses</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #666;
              padding-bottom: 10px;
            }
            .event {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              margin: 15px 0;
              page-break-inside: avoid;
            }
            .event-title {
              font-size: 18px;
              font-weight: bold;
              color: #1a1a1a;
              margin-bottom: 8px;
            }
            .event-detail {
              margin: 5px 0;
              color: #666;
            }
            .event-date {
              color: #0066cc;
              font-weight: 500;
            }
            .event-type {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              background: #f0f0f0;
              font-size: 12px;
              margin-top: 8px;
            }
            @media print {
              body { padding: 10px; }
              .event { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Calendario - ${timeRange === 'past' ? 'Últimos' : 'Próximos'} ${monthsCount} meses</h1>
          <p style="color: #666; margin-bottom: 30px;">
            Total de eventos: ${filteredEvents.length}
          </p>
          ${filteredEvents.map(event => `
            <div class="event">
              <div class="event-title">${event.title}</div>
              <div class="event-detail event-date">
                📅 ${format(new Date(event.start_date), "d 'de' MMMM yyyy, HH:mm", { locale: es })} - 
                ${format(new Date(event.end_date), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
              </div>
              ${event.location ? `<div class="event-detail">📍 ${event.location}</div>` : ''}
              ${event.description ? `<div class="event-detail">${event.description}</div>` : ''}
              <span class="event-type">${event.event_type}</span>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    if (exportType === 'print') {
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 100);
      };
    }
    
    setOpen(false);
  };

  const handleExport = () => {
    if (exportType === 'csv') {
      generateCSV();
    } else {
      generatePDF();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Calendario</DialogTitle>
          <DialogDescription>
            Selecciona el formato y rango de fechas para exportar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Tipo de exportación */}
          <div className="space-y-3">
            <Label>Tipo de exportación</Label>
            <RadioGroup value={exportType} onValueChange={(value: any) => setExportType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="download" id="download" />
                <Label htmlFor="download" className="flex items-center gap-2 cursor-pointer">
                  <Download className="h-4 w-4" />
                  Descargar calendario (PDF)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="print" id="print" />
                <Label htmlFor="print" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Imprimir calendario
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileDown className="h-4 w-4" />
                  Descargar archivo CSV
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Rango de tiempo */}
          <div className="space-y-3">
            <Label>Rango de fechas</Label>
            <RadioGroup value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="past" id="past" />
                <Label htmlFor="past" className="cursor-pointer">Últimos meses</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="future" id="future" />
                <Label htmlFor="future" className="cursor-pointer">Próximos meses</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Número de meses */}
          <div className="space-y-3">
            <Label htmlFor="months">Número de meses</Label>
            <Input
              id="months"
              type="number"
              min="1"
              max="12"
              value={monthsCount}
              onChange={(e) => setMonthsCount(parseInt(e.target.value) || 1)}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Se exportarán {getFilteredEvents().length} eventos
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport}>
            {exportType === 'csv' ? 'Descargar CSV' : exportType === 'print' ? 'Imprimir' : 'Descargar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
