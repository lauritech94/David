import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  History, 
  ChevronDown, 
  ChevronRight,
  PlusCircle,
  Edit,
  ArrowRightLeft,
  DollarSign,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryEvent {
  id: string;
  event_type: string;
  field_changed: string | null;
  previous_value: any;
  new_value: any;
  changed_at: string;
  changed_by: string | null;
  metadata: any;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface BookingHistorySectionProps {
  bookingId: string;
}

// Field labels for Spanish display
const fieldLabels: Record<string, string> = {
  fee: 'Fee',
  fecha: 'Fecha',
  hora: 'Hora',
  ciudad: 'Ciudad',
  pais: 'País',
  venue: 'Venue',
  lugar: 'Lugar',
  capacidad: 'Capacidad',
  formato: 'Formato',
  duracion: 'Duración',
  promotor: 'Promotor',
  contacto: 'Contacto',
  tour_manager: 'Tour Manager',
  condiciones: 'Condiciones',
  pvp: 'PVP',
  invitaciones: 'Invitaciones',
  gastos_estimados: 'Gastos Estimados',
  comision_porcentaje: 'Comisión %',
  comision_euros: 'Comisión €',
  
  es_internacional: 'Internacional',
  estado_facturacion: 'Estado Facturación',
  link_venta: 'Link Venta',
  festival_ciclo: 'Festival/Ciclo',
  folder_url: 'Carpeta',
  notas: 'Notas',
  info_comentarios: 'Notas del Artista',
  logistica: 'Logística',
  publico: 'Público',
  artist_id: 'Artista',
  project_id: 'Proyecto',
  viability_manager_approved: 'Viabilidad Manager',
  viability_tour_manager_approved: 'Viabilidad Tour Manager',
  viability_production_approved: 'Viabilidad Producción',
};

export function BookingHistorySection({ bookingId }: BookingHistorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if ((isOpen || isFullscreen) && !loaded) {
      fetchHistory();
    }
  }, [isOpen, isFullscreen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('changed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch profiles for all unique user IDs
      const historyData = (data || []) as unknown as HistoryEvent[];
      const userIds = [...new Set(historyData.map(h => h.changed_by).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', userIds);
        
        // Map profiles to history events
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        historyData.forEach(event => {
          if (event.changed_by) {
            event.profile = profileMap.get(event.changed_by) || null;
          }
        });
      }
      
      setHistory(historyData);
      setLoaded(true);
    } catch (error) {
      console.error('Error fetching booking history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProfileName = (event: HistoryEvent): string => {
    if (!event.profile) return 'Sistema';
    const { first_name, last_name } = event.profile;
    if (first_name || last_name) {
      return [first_name, last_name].filter(Boolean).join(' ');
    }
    return 'Usuario';
  };

  const getEventIcon = (eventType: string, fieldChanged: string | null) => {
    switch (eventType) {
      case 'created':
        return <PlusCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'status_change':
        return <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />;
      case 'phase_change':
        return <ArrowRightLeft className="h-3.5 w-3.5 text-purple-500" />;
      case 'availability_change':
        return <Users className="h-3.5 w-3.5 text-cyan-500" />;
      case 'updated':
        if (fieldChanged?.includes('fee') || fieldChanged?.includes('comision')) {
          return <DollarSign className="h-3.5 w-3.5 text-primary" />;
        }
        if (fieldChanged?.includes('fecha')) {
          return <Calendar className="h-3.5 w-3.5 text-orange-500" />;
        }
        if (fieldChanged?.includes('ciudad') || fieldChanged?.includes('venue')) {
          return <MapPin className="h-3.5 w-3.5 text-red-500" />;
        }
        if (fieldChanged?.includes('viability')) {
          return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
        }
        return <Edit className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <History className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <Badge variant="default" className="bg-green-500 text-xs">Creado</Badge>;
      case 'status_change':
        return <Badge variant="secondary" className="text-xs">Estado</Badge>;
      case 'phase_change':
        return <Badge className="bg-purple-500 text-xs">Fase</Badge>;
      case 'availability_change':
        return <Badge className="bg-cyan-500 text-xs">Disponibilidad</Badge>;
      case 'updated':
        return <Badge variant="outline" className="text-xs">Edición</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{eventType}</Badge>;
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
      if (value > 100) return `${value.toLocaleString()}€`;
      return value.toString();
    }
    if (typeof value === 'string') {
      // Try to parse date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        try {
          return format(new Date(value), 'd MMM yyyy', { locale: es });
        } catch {
          return value;
        }
      }
      return value;
    }
    return JSON.stringify(value);
  };

  const getEventDescription = (event: HistoryEvent): React.ReactNode => {
    switch (event.event_type) {
      case 'created': {
        const name = event.metadata?.festival_ciclo || event.metadata?.venue || 'Nuevo booking';
        return <span>Booking creado: <span className="font-medium">{name}</span></span>;
      }
      case 'status_change': {
        const oldStatus = typeof event.previous_value === 'string' ? event.previous_value : event.previous_value?.toString() || '-';
        const newStatus = typeof event.new_value === 'string' ? event.new_value : event.new_value?.toString() || '-';
        return (
          <span>
            Estado: <span className="text-muted-foreground line-through">{oldStatus}</span>
            {' → '}
            <span className="font-medium">{newStatus}</span>
          </span>
        );
      }
      case 'phase_change': {
        const oldPhase = typeof event.previous_value === 'string' ? event.previous_value : event.previous_value?.toString() || '-';
        const newPhase = typeof event.new_value === 'string' ? event.new_value : event.new_value?.toString() || '-';
        return (
          <span>
            Fase: <span className="text-muted-foreground line-through capitalize">{oldPhase}</span>
            {' → '}
            <span className="font-medium capitalize">{newPhase}</span>
          </span>
        );
      }
      case 'availability_change': {
        // Use the description from metadata if available
        if (event.metadata?.description) {
          return <span>{event.metadata.description}</span>;
        }
        return <span>Cambio en disponibilidad del equipo</span>;
      }
      case 'updated': {
        const changes = event.metadata || {};
        const changedFields = Object.keys(changes);
        
        if (changedFields.length === 0) {
          return <span>Datos actualizados</span>;
        }
        
        if (changedFields.length === 1) {
          const field = changedFields[0];
          const change = changes[field];
          const label = fieldLabels[field] || field;
          return (
            <span>
              {label}: <span className="text-muted-foreground line-through">{formatValue(change?.old)}</span>
              {' → '}
              <span className="font-medium">{formatValue(change?.new)}</span>
            </span>
          );
        }
        
        return (
          <div className="space-y-0.5">
            <span className="font-medium">{changedFields.length} campos actualizados:</span>
            <ul className="text-xs text-muted-foreground pl-3">
              {changedFields.slice(0, 3).map(field => (
                <li key={field}>{fieldLabels[field] || field}</li>
              ))}
              {changedFields.length > 3 && (
                <li>+{changedFields.length - 3} más</li>
              )}
            </ul>
          </div>
        );
      }
      default:
        return <span>{event.event_type}</span>;
    }
  };

  const HistoryList = ({ maxHeight }: { maxHeight?: string }) => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Cargando historial...
        </div>
      ) : history.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Clock className="h-4 w-4 mr-2" />
          Sin cambios registrados
        </div>
      ) : (
        <ScrollArea className={maxHeight || "h-80"} type="always">
          <div className="p-3 space-y-2">
            {history.map((event, index) => (
              <div 
                key={event.id} 
                className={cn(
                  "flex gap-3 p-2.5 rounded-md bg-background/50 border border-transparent hover:border-border/50 transition-colors",
                  index === 0 && "bg-primary/5 border-primary/20"
                )}
              >
                <div className="mt-0.5">
                  {getEventIcon(event.event_type, event.field_changed)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      {getEventDescription(event)}
                    </div>
                    {getEventBadge(event.event_type)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="font-medium text-foreground/70">{getProfileName(event)}</span>
                    <span>·</span>
                    <span>{format(new Date(event.changed_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between text-muted-foreground hover:text-foreground border border-dashed"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial del Evento
              {history.length > 0 && (
                <Badge variant="secondary" className="text-xs">{history.length}</Badge>
              )}
            </span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 border rounded-lg bg-muted/20">
            <div className="flex justify-end p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(true)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1" />
                Pantalla completa
              </Button>
            </div>
            <HistoryList maxHeight="h-80" />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial del Evento
              {history.length > 0 && (
                <Badge variant="secondary">{history.length} cambios</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden border rounded-lg bg-muted/20">
            <HistoryList maxHeight="h-full" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}