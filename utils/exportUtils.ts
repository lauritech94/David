import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  [key: string]: any;
}

export const exportToCSV = (data: ExportData[], filename: string, headers?: { [key: string]: string }) => {
  if (data.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  // Get all unique keys from data
  const allKeys = Array.from(new Set(data.flatMap(Object.keys)));
  
  // Create header row
  const headerRow = allKeys.map(key => headers?.[key] || key).join(',');
  
  // Create data rows
  const dataRows = data.map(item => 
    allKeys.map(key => {
      const value = item[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportBudgetToPDF = (
  budget: any, 
  items: any[], 
  categories: any[]
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Presupuesto', 20, 30);
  
  // Budget info
  doc.setFontSize(12);
  let yPosition = 50;
  
  doc.text(`Nombre: ${budget.name || 'Sin nombre'}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Tipo: ${budget.type || 'No especificado'}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Ciudad: ${budget.city || 'No especificada'}`, 20, yPosition);
  yPosition += 10;
  doc.text(`País: ${budget.country || 'No especificado'}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Fecha: ${budget.event_date ? new Date(budget.event_date).toLocaleDateString() : 'No especificada'}`, 20, yPosition);
  yPosition += 10;
  doc.text(`${budget.type === 'concierto' ? 'Caché' : 'Capital'}: €${budget.fee || 0}`, 20, yPosition);
  yPosition += 20;

  // Categories summary
  if (categories.length > 0) {
    doc.setFontSize(16);
    doc.text('Resumen por Categorías', 20, yPosition);
    yPosition += 15;

    const categoryData = categories.map(category => [
      category.name,
      `€${category.total || 0}`
    ]);

    doc.autoTable({
      head: [['Categoría', 'Total']],
      body: categoryData,
      startY: yPosition,
      margin: { left: 20 },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }

  // Items detail
  if (items.length > 0) {
    doc.setFontSize(16);
    doc.text('Detalle de Elementos', 20, yPosition);
    yPosition += 15;

    const itemsData = items.map(item => [
      item.name || 'Sin nombre',
      item.category || 'Sin categoría',
      item.quantity || 1,
      `€${item.unit_price || 0}`,
      `${item.iva_percentage || 0}%`,
      `€${(item.quantity || 1) * (item.unit_price || 0) * (1 + (item.iva_percentage || 0) / 100)}`
    ]);

    doc.autoTable({
      head: [['Elemento', 'Categoría', 'Cantidad', 'Precio Unit.', 'IVA', 'Total']],
      body: itemsData,
      startY: yPosition,
      margin: { left: 20 },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right' }
      }
    });
  }

  // Calculate total
  const total = items.reduce((sum, item) => 
    sum + (item.quantity || 1) * (item.unit_price || 0) * (1 + (item.iva_percentage || 0) / 100), 0
  );

  yPosition = (doc as any).lastAutoTable?.finalY + 20 || yPosition + 20;
  doc.setFontSize(14);
  doc.text(`Total General: €${total.toFixed(2)}`, 20, yPosition);

  // Save
  doc.save(`presupuesto_${budget.name || 'sin_nombre'}.pdf`);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

export const generateOfferNumber = (offer: any): string => {
  const date = new Date(offer.created_at || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const id = offer.id?.slice(-6) || '000000';
  
  return `OFF-${year}${month}${day}-${id.toUpperCase()}`;
};