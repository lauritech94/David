import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, Circle, AlertCircle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingTimelineProps {
  bookingId: string;
  bookingPhase?: string;
  eventDate?: string;
}

interface TimelineItem {
  id: string;
  date: string;
  label: string;
  type: 'past' | 'today' | 'upcoming' | 'overdue';
  checkpointId?: string;
  status?: string;
}

export function BookingTimeline({ bookingId, bookingPhase, eventDate }: BookingTimelineProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('timeline_collapsed') === 'true');
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('timeline_collapsed', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    setLoading(true);
    const [historyRes, checkpointsRes] = await Promise.all([
      supabase
        .from('booking_history')
        .select('*')
        .eq('booking_id', bookingId)
        .in('event_type', ['created', 'phase_change', 'status_change'])
        .order('changed_at', { ascending: true }),
      supabase
        .from('booking_checkpoints')
        .select('*')
        .eq('booking_offer_id', bookingId)
        .order('due_date', { ascending: true }),
    ]);
    setHistory(historyRes.data || []);
    setCheckpoints(checkpointsRes.data || []);
    setLoading(false);
  };

  const handleMarkDone = async (checkpointId: string) => {
    await supabase
      .from('booking_checkpoints')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', checkpointId);
    setCheckpoints(prev =>
      prev.map(c => c.id === checkpointId ? { ...c, status: 'done', completed_at: new Date().toISOString() } : c)
    );
  };

  const today = new Date().toISOString().split('T')[0];

  // Build timeline items
  const items: TimelineItem[] = [];

  // Past events from history
  const phaseLabels: Record<string, string> = {
    interes: 'Interés registrado',
    oferta: 'Oferta enviada',
    negociacion: 'Entró en Negociación',
    confirmado: 'Confirmado (viabilidad OK)',
    realizado: 'Evento realizado',
    facturado: 'Facturado',
  };

  for (const h of history) {
    if (h.event_type === 'created') {
      items.push({
        id: h.id,
        date: h.changed_at,
        label: 'Oferta creada',
        type: 'past',
      });
    } else if (h.event_type === 'phase_change' && h.new_value) {
      const phase = typeof h.new_value === 'string' ? h.new_value.replace(/\"/g, '') : String(h.new_value).replace(/\"/g, '');
      items.push({
        id: h.id,
        date: h.changed_at,
        label: phaseLabels[phase] || `Movido a ${phase}`,
        type: 'past',
      });
    }
  }

  // Upcoming checkpoints
  for (const cp of checkpoints) {
    if (cp.status === 'done') {
      items.push({
        id: cp.id,
        date: cp.completed_at || cp.due_date,
        label: cp.label,
        type: 'past',
        checkpointId: cp.id,
        status: 'done',
      });
    } else if (cp.due_date) {
      const isOverdue = cp.due_date < today;
      items.push({
        id: cp.id,
        date: cp.due_date,
        label: cp.label,
        type: isOverdue ? 'overdue' : cp.due_date === today ? 'today' : 'upcoming',
        checkpointId: cp.id,
        status: cp.status,
      });
    }
  }

  // Add event date if available
  if (eventDate) {
    const eventPast = eventDate < today;
    if (!items.some(i => i.label.includes('DÍA DEL EVENTO'))) {
      items.push({
        id: 'event-day',
        date: eventDate,
        label: 'DÍA DEL EVENTO',
        type: eventPast ? 'past' : eventDate === today ? 'today' : 'upcoming',
      });
    }
  }

  // Sort by date
  items.sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate by label (keep the last one)
  const seen = new Set<string>();
  const dedupedItems = items.filter(item => {
    const key = item.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Cargando...</p></CardContent>
      </Card>
    );
  }




  const overdueCount = checkpoints.filter(c => c.status !== 'done' && c.due_date && c.due_date < today).length;
  const pendingCount = checkpoints.filter(c => c.status === 'pending' && (!c.due_date || c.due_date >= today)).length;

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={toggleCollapsed}>
        <CardTitle className="text-sm flex items-center gap-2 w-full">
          <Clock className="h-4 w-4" />
          Timeline
          {collapsed && (
            <div className="flex items-center gap-2 ml-2">
              {overdueCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                  {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
              {overdueCount === 0 && pendingCount === 0 && checkpoints.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">✓ Al día</span>
              )}
            </div>
          )}
          <ChevronDown className={`h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </CardTitle>
      </CardHeader>
      {!collapsed && <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-3">
            {dedupedItems.map((item) => {
              const isPast = item.type === 'past' || item.status === 'done';
              const isOverdue = item.type === 'overdue';
              const isToday = item.type === 'today';
              const isUpcoming = item.type === 'upcoming';

              const dateStr = (() => {
                try {
                  return format(new Date(item.date), 'dd MMM', { locale: es });
                } catch {
                  return '';
                }
              })();

              return (
                <div key={item.id} className="flex items-start gap-3 pl-1 relative">
                  {/* Dot */}
                  <div className={`relative z-10 mt-0.5 flex items-center justify-center w-5 h-5 rounded-full ${
                    isPast ? 'bg-primary/20' :
                    isOverdue ? 'bg-destructive/20' :
                    isToday ? 'bg-primary/30 ring-2 ring-primary/50' :
                    'bg-muted'
                  }`}>
                    {isPast ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : isOverdue ? (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    ) : isToday ? (
                      <Clock className="h-3 w-3 text-primary" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        isPast ? 'text-muted-foreground' :
                        isOverdue ? 'text-destructive font-bold' :
                        isToday ? 'text-primary font-bold' :
                        'text-foreground'
                      }`}>
                        {dateStr}
                      </span>
                      <span className={`text-xs ${
                        isPast ? 'text-muted-foreground' :
                        isOverdue ? 'text-destructive' :
                        isToday ? 'text-primary font-semibold' :
                        'text-foreground'
                      }`}>
                        {isToday && '⏳ '}{item.label}
                      </span>
                    </div>
                  </div>

                  {/* Action button for pending checkpoints */}
                  {item.checkpointId && item.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => handleMarkDone(item.checkpointId!)}
                    >
                      <Check className="h-3 w-3 mr-1" /> Hecho
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>}
    </Card>
  );
}
