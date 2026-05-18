import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mic, ArrowRight, MapPin, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PHASE_COLORS: Record<string, string> = {
  interes: 'bg-blue-500/20 text-blue-600',
  oferta: 'bg-purple-500/20 text-purple-600',
  negociacion: 'bg-yellow-500/20 text-yellow-600',
  confirmado: 'bg-green-500/20 text-green-600',
  descartado: 'bg-red-500/20 text-red-500',
};

const PHASE_LABELS: Record<string, string> = {
  interes: 'Interés',
  oferta: 'Oferta',
  negociacion: 'Negociación',
  confirmado: 'Confirmado',
  descartado: 'Descartado',
};

interface Props {
  projectId: string;
}

export function ProjectLinkedBookings({ projectId }: Props) {
  const navigate = useNavigate();

  const { data: bookings } = useQuery({
    queryKey: ['project-bookings-linked', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_offers')
        .select('id, festival_ciclo, venue, ciudad, fecha, fee, phase, estado')
        .eq('project_id', projectId)
        .order('fecha', { ascending: false, nullsFirst: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  if (!bookings || bookings.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold">Eventos de Booking vinculados</h3>
        <Badge variant="secondary" className="text-[10px]">{bookings.length}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {bookings.map((booking) => {
          const eventName = booking.festival_ciclo || booking.venue || 'Evento';
          const phase = booking.phase || booking.estado || 'interes';
          return (
            <Card
              key={booking.id}
              className="group cursor-pointer p-3 hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => navigate(`/booking/${booking.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-purple-500/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {eventName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge className={`text-[10px] ${PHASE_COLORS[phase] || ''}`}>
                      {PHASE_LABELS[phase] || phase}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    {booking.fecha && (
                      <span>{format(new Date(booking.fecha), 'dd MMM yyyy', { locale: es })}</span>
                    )}
                    {booking.ciudad && (
                      <span>• {booking.ciudad}</span>
                    )}
                    {booking.fee != null && booking.fee > 0 && (
                      <span>• €{booking.fee.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
