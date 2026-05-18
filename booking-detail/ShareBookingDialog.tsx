import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShareBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    festival_ciclo?: string;
    venue?: string;
    fecha?: string;
    hora?: string;
    ciudad?: string;
    pais?: string;
    promotor?: string;
    fee?: number;
    formato?: string;
    condiciones?: string;
  };
}

export function ShareBookingDialog({ open, onOpenChange, booking }: ShareBookingDialogProps) {
  const [customMessage, setCustomMessage] = useState('');

  const eventName = booking.festival_ciclo || booking.venue || 'Evento';
  const eventDate = booking.fecha 
    ? format(new Date(booking.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })
    : 'Fecha por confirmar';

  const generateSummaryText = () => {
    const lines = [
      `📅 ${eventName}`,
      '',
      `📆 Fecha: ${eventDate}${booking.hora ? ` - ${booking.hora}` : ''}`,
      booking.venue ? `🎪 Venue: ${booking.venue}` : null,
      booking.ciudad ? `📍 Ubicación: ${[booking.ciudad, booking.pais].filter(Boolean).join(', ')}` : null,
      booking.promotor ? `👤 Promotor: ${booking.promotor}` : null,
      booking.fee ? `💰 Fee: ${booking.fee.toLocaleString()}€` : null,
      booking.formato ? `🎵 Formato: ${booking.formato}` : null,
      booking.condiciones ? `\n📝 Condiciones:\n${booking.condiciones}` : null,
      customMessage ? `\n💬 Nota:\n${customMessage}` : null,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSummaryText());
    toast({
      title: "Copiado",
      description: "Resumen copiado al portapapeles",
    });
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Info: ${eventName} - ${eventDate}`);
    const body = encodeURIComponent(generateSummaryText());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(generateSummaryText());
    window.open(`https://wa.me/?text=${text}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir Evento
          </DialogTitle>
          <DialogDescription>
            Comparte la información del evento con tu equipo o promotor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
            {generateSummaryText()}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Añadir nota personalizada (opcional)</Label>
            <Textarea
              placeholder="Añade información adicional..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
            />
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleCopy} variant="outline" className="w-full justify-start">
              <Copy className="h-4 w-4 mr-2" />
              Copiar al portapapeles
            </Button>
            <Button onClick={handleEmail} variant="outline" className="w-full justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Enviar por email
            </Button>
            <Button onClick={handleWhatsApp} variant="outline" className="w-full justify-start">
              <MessageCircle className="h-4 w-4 mr-2" />
              Compartir en WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
