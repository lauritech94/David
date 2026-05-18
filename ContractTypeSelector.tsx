import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ScrollText } from 'lucide-react';

interface ContractTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBooking: () => void;
  onSelectIPLicense: () => void;
  showBooking?: boolean;
}

export function ContractTypeSelector({ open, onOpenChange, onSelectBooking, onSelectIPLicense, showBooking = true }: ContractTypeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Seleccionar tipo de contrato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {showBooking && (
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => { onOpenChange(false); onSelectBooking(); }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Contrato de Booking</p>
                  <p className="text-sm text-muted-foreground">Contrato de prestación de servicios artísticos para eventos</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => { onOpenChange(false); onSelectIPLicense(); }}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <ScrollText className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Licencia de Propiedad Intelectual</p>
                <p className="text-sm text-muted-foreground">Cesión de derechos de propiedad intelectual para grabaciones</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
