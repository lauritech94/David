import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface BookingOffer {
  id: string;
  fecha?: string;
  hora?: string;
  venue?: string;
  ciudad?: string;
  pais?: string;
  festival_ciclo?: string;
  phase?: string;
  es_internacional?: boolean;
}

interface UpcomingEventsWidgetProps {
  offers: BookingOffer[];
  maxItems?: number;
}

export function UpcomingEventsWidget({ offers, maxItems = 8 }: UpcomingEventsWidgetProps) {
  const navigate = useNavigate();

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return offers
      .filter(offer => {
        if (!offer.fecha) return false;
        const eventDate = new Date(offer.fecha);
        // Only show confirmed events in the future
        return eventDate >= now && (offer.phase === 'confirmado' || offer.phase === 'facturado');
      })
      .sort((a, b) => {
        const dateA = new Date(a.fecha!);
        const dateB = new Date(b.fecha!);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, maxItems);
  }, [offers, maxItems]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    if (isThisWeek(date)) return format(date, 'EEEE', { locale: es });
    if (isThisMonth(date)) return format(date, "d 'de' MMMM", { locale: es });
    return format(date, "d MMM yyyy", { locale: es });
  };

  const getDateBadgeVariant = (dateStr: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'destructive';
    if (isTomorrow(date)) return 'default';
    if (isThisWeek(date)) return 'secondary';
    return 'outline';
  };

  if (upcomingEvents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay eventos confirmados próximos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Próximos Eventos
          <Badge variant="secondary" className="ml-auto text-xs">
            {upcomingEvents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-3 pt-0">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/booking/${event.id}`)}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                <div className="flex flex-col items-center min-w-[50px]">
                  <Badge 
                    variant={getDateBadgeVariant(event.fecha!)}
                    className="text-[10px] px-1.5 whitespace-nowrap"
                  >
                    {getDateLabel(event.fecha!)}
                  </Badge>
                  {event.hora && (
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {event.hora}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {event.festival_ciclo || event.venue || 'Evento'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {[event.venue, event.ciudad, event.pais].filter(Boolean).join(', ') || 'Sin ubicación'}
                  </p>
                </div>

                {event.es_internacional && (
                  <Badge variant="outline" className="text-[10px] px-1 border-blue-500 text-blue-600 flex-shrink-0">
                    INT
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
