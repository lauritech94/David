import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  headers: Record<string, string>;
}

export function exportToExcel(data: any[], options: ExcelExportOptions) {
  const { filename, sheetName = 'Datos', headers } = options;
  
  // Create CSV content with BOM for Excel compatibility
  const BOM = '\uFEFF';
  
  // Get header row
  const headerRow = Object.values(headers).join('\t');
  
  // Get data rows
  const dataRows = data.map(row => {
    return Object.keys(headers).map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Sí' : 'No';
      if (typeof value === 'number') return value.toString().replace('.', ','); // European format
      return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
    }).join('\t');
  });
  
  const content = BOM + [headerRow, ...dataRows].join('\n');
  
  // Create and download file
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateBookingExportData(offers: any[], phases: { id: string; label: string }[]) {
  return offers.map(offer => ({
    phase: phases.find(p => p.id === offer.phase)?.label || offer.phase,
    fecha: offer.fecha ? format(new Date(offer.fecha), 'dd/MM/yyyy', { locale: es }) : '',
    hora: offer.hora || '',
    festival: offer.festival_ciclo || '',
    venue: offer.venue || '',
    ciudad: offer.ciudad || '',
    pais: offer.pais || '',
    promotor: offer.promotor || '',
    fee: offer.fee || 0,
    gastos_estimados: offer.gastos_estimados || 0,
    comision_porcentaje: offer.comision_porcentaje || 0,
    comision_euros: offer.comision_euros || 0,
    neto_estimado: (offer.fee || 0) - (offer.gastos_estimados || 0) - (offer.comision_euros || 0),
    capacidad: offer.capacidad || '',
    formato: offer.formato || '',
    
    es_internacional: offer.es_internacional || false,
    estado_facturacion: offer.estado_facturacion || 'pendiente',
    tour_manager: offer.tour_manager || '',
    contacto: offer.contacto || '',
    condiciones: offer.condiciones || '',
    created_at: offer.created_at ? format(new Date(offer.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
  }));
}

export const BOOKING_EXPORT_HEADERS = {
  phase: 'Fase',
  fecha: 'Fecha',
  hora: 'Hora',
  festival: 'Festival/Ciclo',
  venue: 'Venue',
  ciudad: 'Ciudad',
  pais: 'País',
  promotor: 'Promotor',
  fee: 'Fee (€)',
  gastos_estimados: 'Gastos Est. (€)',
  comision_porcentaje: 'Comisión (%)',
  comision_euros: 'Comisión (€)',
  neto_estimado: 'Neto Estimado (€)',
  capacidad: 'Capacidad',
  formato: 'Formato',
  
  es_internacional: 'Internacional',
  estado_facturacion: 'Estado Facturación',
  tour_manager: 'Tour Manager',
  contacto: 'Contacto',
  condiciones: 'Condiciones',
  created_at: 'Creado',
};
