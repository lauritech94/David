import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, Calendar, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ApprovalAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: string;
  bookingId: string | null;
  bookingName: string;
  hasAvailability: boolean;
  unavailableMembers: string[];
  onApproved: () => void;
  comment: string;
  userId: string | undefined;
}

type ApprovalAction = 'confirm' | 'new_date' | 'tentative' | 'deny';

export function ApprovalAvailabilityDialog({
  open,
  onOpenChange,
  solicitudId,
  bookingId,
  bookingName,
  hasAvailability,
  unavailableMembers,
  onApproved,
  comment,
  userId,
}: ApprovalAvailabilityDialogProps) {
  const [action, setAction] = useState<ApprovalAction>('confirm');
  const [additionalNote, setAdditionalNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Always approve the solicitud
      const { error: solicitudError } = await supabase
        .from('solicitudes')
        .update({
          estado: 'aprobada',
          comentario_estado: comment || null,
          decision_por: userId || null,
          decision_fecha: new Date().toISOString(),
        } as any)
        .eq('id', solicitudId);

      if (solicitudError) throw solicitudError;

      // Handle booking based on action
      if (bookingId) {
        let bookingUpdate: any = {};
        let toastMessage = '';

        switch (action) {
          case 'confirm':
            // Move to negociación phase - this triggers folder/budget creation
            bookingUpdate = { phase: 'negociacion' };
            toastMessage = 'Solicitud aprobada y booking movido a Negociación';
            break;
          case 'new_date':
            // Keep in current phase, add note about finding new date
            bookingUpdate = { 
              info_comentarios: `[Buscar nueva fecha] ${additionalNote}`.trim()
            };
            toastMessage = 'Solicitud aprobada - Pendiente buscar nueva fecha';
            break;
          case 'tentative':
            // Move to oferta phase as tentative
            bookingUpdate = { 
              phase: 'oferta',
              info_comentarios: `[TENTATIVO] ${additionalNote}`.trim()
            };
            toastMessage = 'Solicitud aprobada - Booking marcado como tentativo';
            break;
          case 'deny':
            // Actually deny the solicitud instead
            await supabase
              .from('solicitudes')
              .update({
                estado: 'denegada',
                comentario_estado: `Sin disponibilidad del equipo. ${additionalNote}`.trim(),
                decision_por: userId || null,
                decision_fecha: new Date().toISOString(),
              } as any)
              .eq('id', solicitudId);
            
            // Cancel the booking
            bookingUpdate = { phase: 'cancelado' };
            toastMessage = 'Oferta denegada por falta de disponibilidad';
            break;
        }

        if (Object.keys(bookingUpdate).length > 0) {
          const { error: bookingError } = await supabase
            .from('booking_offers')
            .update(bookingUpdate)
            .eq('id', bookingId);

          if (bookingError) throw bookingError;
        }

        toast({ title: 'Éxito', description: toastMessage });
      } else {
        toast({ title: 'Solicitud aprobada', description: 'El estado ha sido actualizado.' });
      }

      onOpenChange(false);
      onApproved();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la aprobación.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasAvailability ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            {hasAvailability ? 'Confirmar aprobación' : 'Conflicto de disponibilidad'}
          </DialogTitle>
          <DialogDescription>
            {hasAvailability ? (
              <>El equipo tiene disponibilidad para <strong>{bookingName}</strong>. ¿Deseas aprobar y mover a negociación?</>
            ) : (
              <>
                Hay miembros del equipo sin disponibilidad para <strong>{bookingName}</strong>:
                <ul className="mt-2 list-disc list-inside text-sm">
                  {unavailableMembers.map((member, i) => (
                    <li key={i} className="text-destructive">{member}</li>
                  ))}
                </ul>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!hasAvailability && (
          <div className="space-y-4">
            <RadioGroup value={action} onValueChange={(v) => setAction(v as ApprovalAction)}>
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="confirm" id="confirm" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="confirm" className="flex items-center gap-2 cursor-pointer font-medium">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Confirmar de todas formas
                  </Label>
                  <p className="text-xs text-muted-foreground">Aprobar y mover a negociación ignorando conflictos</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="new_date" id="new_date" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="new_date" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Buscar nueva fecha
                  </Label>
                  <p className="text-xs text-muted-foreground">Aprobar pero buscar fecha alternativa con disponibilidad</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="tentative" id="tentative" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="tentative" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Marcar como tentativo
                  </Label>
                  <p className="text-xs text-muted-foreground">Aprobar pero mantener como oferta tentativa</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="deny" id="deny" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="deny" className="flex items-center gap-2 cursor-pointer font-medium">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Denegar oferta
                  </Label>
                  <p className="text-xs text-muted-foreground">Rechazar la solicitud por falta de disponibilidad</p>
                </div>
              </div>
            </RadioGroup>

            {(action === 'new_date' || action === 'tentative' || action === 'deny') && (
              <Textarea
                placeholder="Nota adicional (opcional)..."
                value={additionalNote}
                onChange={(e) => setAdditionalNote(e.target.value)}
                rows={2}
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Procesando...' : hasAvailability ? 'Aprobar y Negociar' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
