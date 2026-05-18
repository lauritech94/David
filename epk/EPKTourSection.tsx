import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Music, Ticket, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TourEvent {
  id: string;
  fecha: string | null;
  hora: string | null;
  ciudad: string | null;
  pais: string | null;
  venue: string | null;
  festival_ciclo: string | null;
  link_venta: string | null;
  formato: string | null;
}

interface EPKTourSectionProps {
  artistId?: string;
  projectId?: string;
  className?: string;
}

export const EPKTourSection: React.FC<EPKTourSectionProps> = ({
  artistId,
  projectId,
  className
}) => {
  const [events, setEvents] = useState<TourEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTourEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, projectId]);

  const fetchTourEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('booking_offers')
        .select('id, fecha, hora, ciudad, pais, venue, festival_ciclo, link_venta, formato, artist_id, project_id')
        .eq('estado', 'confirmado') // Only confirmed events
        .eq('anunciado', true) // Only announced events
        .or('es_privado.is.null,es_privado.eq.false') // Exclude private events (handle null case)
        .not('fecha', 'is', null) // Only events with dates
        .gte('fecha', new Date().toISOString().split('T')[0]) // Only future events
        .order('fecha', { ascending: true });

      // Filter by artist or project if provided
      if (artistId) {
        query = query.eq('artist_id', artistId);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tour events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching tour events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return {
        day: format(date, 'd', { locale: es }),
        month: format(date, 'MMM', { locale: es }).toUpperCase(),
        year: format(date, 'yyyy', { locale: es }),
        full: format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
      };
    } catch {
      return { day: '--', month: '--', year: '--', full: dateStr };
    }
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="h-8 bg-muted rounded w-32 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return null; // Don't show section if no events
  }

  return (
    <Card className={cn("card-moodita overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Próximas Fechas</h3>
              <p className="text-sm text-muted-foreground">Gira confirmada</p>
            </div>
          </div>
        </div>

        {/* Events List - MOODITA Style */}
        <div className="divide-y divide-border/50">
          {events.map((event, index) => {
            const dateInfo = event.fecha ? formatEventDate(event.fecha) : null;
            
            return (
              <div 
                key={event.id}
                className={cn(
                  "group p-6 transition-all duration-300 hover:bg-muted/30",
                  index % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                  {/* Date Block - MOODITA elegant style */}
                  {dateInfo && (
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 group-hover:border-primary/30 transition-colors">
                        <span className="text-3xl font-bold text-primary block leading-none">
                          {dateInfo.day}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {dateInfo.month}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 block">
                          {dateInfo.year}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Event Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Festival/Venue Name */}
                    <div className="flex items-start gap-2">
                      <h4 className="font-semibold text-lg text-foreground truncate">
                        {event.festival_ciclo || event.venue || 'Evento'}
                      </h4>
                      {event.formato && (
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {event.formato}
                        </Badge>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">
                        {[event.venue, event.ciudad, event.pais]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    </div>

                    {/* Time if available */}
                    {event.hora && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{event.hora}h</span>
                      </div>
                    )}
                  </div>

                  {/* Ticket Button */}
                  {event.link_venta && (
                    <div className="flex-shrink-0">
                      <Button 
                        size="sm" 
                        className="group/btn bg-primary hover:bg-primary/90 transition-all"
                        asChild
                      >
                        <a 
                          href={event.link_venta} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <Ticket className="w-4 h-4" />
                          <span>Entradas</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {events.length > 5 && (
          <div className="p-4 bg-muted/20 text-center border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Mostrando {events.length} fechas confirmadas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EPKTourSection;
