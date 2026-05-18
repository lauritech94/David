import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  payer: string;
  handler: string;
  iva_percentage: number | null;
}

interface BookingData {
  id: string;
  venue?: string | null;
  ciudad?: string | null;
  fecha?: string | null;
  promotor?: string | null;
  fee?: number | null;
}

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingData;
  expenses: Expense[];
}

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  booking,
  expenses,
}: GenerateInvoiceDialogProps) {
  const [invoiceType, setInvoiceType] = useState<'promoter' | 'agency' | 'custom'>('promoter');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>(
    expenses.map((e) => e.id)
  );
  const [includeIVA, setIncludeIVA] = useState(true);
  const [ivaRate, setIvaRate] = useState(21);

  // Company info (could be fetched from settings)
  const [companyName, setCompanyName] = useState('Mi Empresa S.L.');
  const [companyNIF, setCompanyNIF] = useState('B12345678');
  const [companyAddress, setCompanyAddress] = useState('Calle Principal 123, 08001 Barcelona');

  // Client info
  const [clientName, setClientName] = useState(booking.promotor || '');
  const [clientNIF, setClientNIF] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const filteredExpenses = expenses.filter((e) => {
    if (invoiceType === 'promoter') return e.payer === 'promotor';
    if (invoiceType === 'agency') return e.payer === 'agencia';
    return selectedExpenses.includes(e.id);
  });

  const subtotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const ivaAmount = includeIVA ? subtotal * (ivaRate / 100) : 0;
  const total = subtotal + ivaAmount;

  const generatePDF = (preview: boolean = false) => {
    if (!invoiceNumber) {
      toast.error('Por favor, ingresa un número de factura');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', pageWidth / 2, 30, { align: 'center' });

    // Invoice number and dates
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº Factura: ${invoiceNumber}`, pageWidth - 20, 20, { align: 'right' });
    doc.text(`Fecha: ${new Date(issueDate).toLocaleDateString('es-ES')}`, pageWidth - 20, 26, { align: 'right' });
    if (dueDate) {
      doc.text(`Vencimiento: ${new Date(dueDate).toLocaleDateString('es-ES')}`, pageWidth - 20, 32, { align: 'right' });
    }

    // Company info (left side)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EMISOR', 20, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, 20, 58);
    doc.text(`NIF: ${companyNIF}`, 20, 64);
    const companyLines = doc.splitTextToSize(companyAddress, 70);
    doc.text(companyLines, 20, 70);

    // Client info (right side)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', pageWidth / 2 + 10, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName || 'Cliente', pageWidth / 2 + 10, 58);
    if (clientNIF) doc.text(`NIF: ${clientNIF}`, pageWidth / 2 + 10, 64);
    if (clientAddress) {
      const clientLines = doc.splitTextToSize(clientAddress, 70);
      doc.text(clientLines, pageWidth / 2 + 10, 70);
    }

    // Event info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const eventInfo = `Evento: ${booking.venue || 'N/A'} - ${booking.ciudad || ''} (${booking.fecha ? new Date(booking.fecha).toLocaleDateString('es-ES') : 'N/A'})`;
    doc.text(eventInfo, 20, 95);

    // Expenses table
    const tableData = filteredExpenses.map((expense) => [
      expense.description,
      expense.category || '-',
      `${expense.amount.toFixed(2)} €`,
    ]);

    autoTable(doc, {
      startY: 105,
      head: [['Concepto', 'Categoría', 'Importe']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40 },
        2: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text('Subtotal:', pageWidth - 60, finalY);
    doc.text(`${subtotal.toFixed(2)} €`, pageWidth - 20, finalY, { align: 'right' });

    if (includeIVA) {
      doc.text(`IVA (${ivaRate}%):`, pageWidth - 60, finalY + 7);
      doc.text(`${ivaAmount.toFixed(2)} €`, pageWidth - 20, finalY + 7, { align: 'right' });
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', pageWidth - 60, finalY + (includeIVA ? 18 : 10));
    doc.text(`${total.toFixed(2)} €`, pageWidth - 20, finalY + (includeIVA ? 18 : 10), { align: 'right' });

    // Notes
    if (notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const notesY = finalY + (includeIVA ? 35 : 25);
      doc.text('Observaciones:', 20, notesY);
      const notesLines = doc.splitTextToSize(notes, pageWidth - 40);
      doc.text(notesLines, 20, notesY + 6);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('Documento generado automáticamente', pageWidth / 2, 285, { align: 'center' });

    const fileName = `Factura_${invoiceNumber}_${booking.venue || 'evento'}.pdf`;

    if (preview) {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } else {
      doc.save(fileName);
      toast.success(`Factura ${invoiceNumber} descargada`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Factura
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Invoice Type */}
          <div className="grid gap-2">
            <Label>Tipo de factura</Label>
            <Select value={invoiceType} onValueChange={(v: any) => setInvoiceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promoter">Gastos Promotor</SelectItem>
                <SelectItem value="agency">Gastos Agencia</SelectItem>
                <SelectItem value="custom">Selección personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoiceNumber">Nº Factura *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="2024-001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issueDate">Fecha emisión</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Vencimiento</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Company Info */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Datos del emisor</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nombre empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Input
                placeholder="NIF/CIF"
                value={companyNIF}
                onChange={(e) => setCompanyNIF(e.target.value)}
              />
            </div>
            <Input
              placeholder="Dirección"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>

          {/* Client Info */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Datos del cliente</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nombre cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <Input
                placeholder="NIF/CIF"
                value={clientNIF}
                onChange={(e) => setClientNIF(e.target.value)}
              />
            </div>
            <Input
              placeholder="Dirección"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
            />
          </div>

          {/* IVA */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeIVA"
                checked={includeIVA}
                onCheckedChange={(c) => setIncludeIVA(!!c)}
              />
              <Label htmlFor="includeIVA">Incluir IVA</Label>
            </div>
            {includeIVA && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={ivaRate}
                  onChange={(e) => setIvaRate(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>

          {/* Expense Summary */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-3">Conceptos ({filteredExpenses.length})</h4>
            <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
              {filteredExpenses.map((e) => (
                <div key={e.id} className="flex justify-between">
                  <span className="truncate">{e.description}</span>
                  <span className="font-mono">{e.amount.toFixed(2)} €</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-mono">{subtotal.toFixed(2)} €</span>
              </div>
              {includeIVA && (
                <div className="flex justify-between text-sm">
                  <span>IVA ({ivaRate}%)</span>
                  <span className="font-mono">{ivaAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="font-mono">{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales para la factura..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => generatePDF(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Vista previa
          </Button>
          <Button onClick={() => generatePDF(false)}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
