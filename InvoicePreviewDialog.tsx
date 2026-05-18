import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceUrl: string;
  invoiceName?: string;
}

export function InvoicePreviewDialog({ 
  open, 
  onOpenChange, 
  invoiceUrl, 
  invoiceName = "Factura" 
}: InvoicePreviewDialogProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = invoiceUrl;
    link.download = invoiceName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-semibold">
              Vista previa - {invoiceName}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cerrar
              </Button>
            </div>
          </DialogHeader>

          {/* Preview Content */}
          <div className="flex-1 p-4">
            <iframe
              src={invoiceUrl}
              className="w-full h-full border rounded-md"
              title={`Vista previa de ${invoiceName}`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}