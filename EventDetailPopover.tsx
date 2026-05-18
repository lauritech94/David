import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2, Mail, MoreHorizontal, X, MapPin, AlignLeft, Calendar, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDraggable } from '@/hooks/useDraggable';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  location: string | null;
  artist_id: string;
}

interface EventDetailPopoverProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistName?: string;
  createdBy?: string;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  position?: { x: number; y: number };
  zIndex?: number;
  onBringToFront?: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export function EventDetailPopover({ 
  event, 
  open, 
  onOpenChange, 
  artistName = "David Solans",
  createdBy = "Fabrica Mudita",
  onEdit,
  onDelete,
  position = { x: 0, y: 0 },
  zIndex = 50,
  onBringToFront,
  onPositionChange
}: EventDetailPopoverProps) {
  // Hook draggable
  const {
    position: currentPosition,
    isDragging,
    elementRef,
    handleMouseDown,
  } = useDraggable({
    initialPosition: position,
    onPositionChange,
  });

  console.log('EventDetailPopover rendering with event:', event);
  
  // Early return DESPUÉS de todos los hooks
  if (!event || !open) return null;

  console.log('Event start_date:', event.start_date);
  console.log('Event end_date:', event.end_date);
  console.log('Position:', currentPosition);

  const eventTypeLabels = {
    'concierto': 'Concierto',
    'entrevista': 'Entrevista', 
    'reunion': 'Reunión',
    'ensayo': 'Ensayo',
    'other': 'Otro'
  };

  const eventTypeColors = {
    'concierto': 'bg-blue-100 text-blue-800',
    'entrevista': 'bg-green-100 text-green-800',
    'reunion': 'bg-purple-100 text-purple-800',
    'ensayo': 'bg-orange-100 text-orange-800',
    'other': 'bg-gray-100 text-gray-800'
  };

  return (
    <div
      ref={elementRef}
      className={`fixed w-80 bg-background border border-border/50 rounded-xl shadow-2xl transition-shadow ${
        isDragging ? 'shadow-3xl cursor-grabbing' : 'cursor-grab hover:shadow-3xl'
      }`}
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        maxHeight: '400px',
        zIndex: zIndex,
      }}
      onMouseDown={(e) => {
        // No permitir drag si se hace clic en un botón o elemento interactivo
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[role="button"]') || target.tagName === 'BUTTON') {
          return; // No hacer nada, dejar que el click del botón funcione
        }
        onBringToFront?.();
        handleMouseDown(e);
      }}
    >
      {/* Header with actions */}
      <div className="flex items-center justify-between p-4 border-b cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <Badge 
            variant="secondary" 
            className={`text-xs ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}`}
          >
            {eventTypeLabels[event.event_type as keyof typeof eventTypeLabels] || 'Evento'}
          </Badge>
        </div>
        <div className="flex items-center gap-1 cursor-auto">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              onClick={() => {
                onOpenChange(false);
                onEdit(event);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => {
              // Simular envío de email
              console.log('Enviando email sobre el evento:', event.title);
              alert(`Enviando email sobre: ${event.title}`);
            }}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => {
              // Mostrar menú de opciones
              console.log('Mostrando más opciones para:', event.title);
              alert('Más opciones disponibles próximamente');
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event details */}
      <div className="p-4 space-y-4">
        {/* Title and date */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.start_date), 'EEEE, d \'de\' MMMM', { locale: es })} • {' '}
              {format(new Date(event.start_date), 'HH:mm')} – {format(new Date(event.end_date), 'HH:mm')}
            </span>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="flex items-start gap-3">
            <AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{event.description}</span>
          </div>
        )}

        {/* Artist info */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium">{artistName}</div>
            <div className="text-muted-foreground">Creado por: {createdBy}</div>
          </div>
        </div>
      </div>
    </div>
  );
}