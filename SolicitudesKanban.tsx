import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, closestCorners, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, GripVertical, Mic, Music, HelpCircle, Info, FileText, AlertTriangle } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
  notas_internas?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  archived?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  created_by: string;
  artist_id?: string;
  fecha_limite_respuesta?: string;
  comentario_estado?: string | null;
  decision_por?: string | null;
  decision_fecha?: string | null;
  medio?: string;
  nombre_entrevistador?: string;
  nombre_programa?: string;
  hora_entrevista?: string;
  informacion_programa?: string;
  hora_show?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  descripcion_libre?: string;
  profiles?: { full_name: string } | null;
  project_id?: string | null;
  project?: { id: string; name: string } | null;
  decision_has_new_comment?: boolean;
}

const COLUMNS = [
  { id: 'pendiente', label: 'Pendientes', color: 'bg-warning/20 border-warning/30', icon: Clock, iconColor: 'text-warning' },
  { id: 'aprobada', label: 'Aprobadas', color: 'bg-success/20 border-success/30', icon: CheckCircle, iconColor: 'text-success' },
  { id: 'denegada', label: 'Denegadas', color: 'bg-destructive/20 border-destructive/30', icon: XCircle, iconColor: 'text-destructive' },
];

const typeConfig: Record<string, { label: string; icon: typeof Mic; color: string }> = {
  entrevista: { label: 'Entrevista', icon: Mic, color: 'bg-green-500' },
  booking: { label: 'Booking', icon: Music, color: 'bg-blue-500' },
  consulta: { label: 'Consulta', icon: HelpCircle, color: 'bg-purple-500' },
  informacion: { label: 'Información', icon: Info, color: 'bg-orange-500' },
  licencia: { label: 'Licencia', icon: FileText, color: 'bg-teal-500' },
  otro: { label: 'Otro', icon: FileText, color: 'bg-muted-foreground' },
};

const defaultTypeConfig = { label: 'Otro', icon: FileText, color: 'bg-muted-foreground' };
const getTypeConfig = (tipo: string) => typeConfig[tipo] || defaultTypeConfig;

interface SolicitudCardProps {
  solicitud: Solicitud;
  onOpenDetails: (solicitud: Solicitud) => void;
}

function SolicitudCard({ solicitud, onOpenDetails }: SolicitudCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: solicitud.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeInfo = getTypeConfig(solicitud.tipo);
  const TypeIcon = typeInfo.icon;

  const getDaysToDeadline = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return differenceInCalendarDays(new Date(dateStr), new Date());
    } catch {
      return null;
    }
  };

  const days = getDaysToDeadline(solicitud.fecha_limite_respuesta);
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 2;

  const getMainContent = () => {
    if (solicitud.tipo === 'booking') {
      return solicitud.nombre_festival || solicitud.lugar_concierto || 'Evento sin nombre';
    } else if (solicitud.tipo === 'entrevista') {
      return solicitud.nombre_programa || solicitud.medio || 'Entrevista';
    }
    return solicitud.nombre_solicitante;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group border rounded-xl p-3 cursor-pointer transition-all duration-200
        hover:shadow-medium hover:border-primary/30
        ${isDragging ? 'opacity-50 shadow-large scale-105 z-50' : ''}
        ${isOverdue ? 'border-destructive/50 bg-muted' : 'bg-card'}
        ${isUrgent && !isOverdue ? 'border-warning/50 bg-warning/5' : ''}
      `}
      onClick={() => onOpenDetails(solicitud)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Type icon */}
        <div className={`w-8 h-8 rounded-lg ${typeInfo.color} flex items-center justify-center flex-shrink-0`}>
          <TypeIcon className="w-4 h-4 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{getMainContent()}</h4>
          <p className="text-xs text-muted-foreground truncate">{typeInfo.label}</p>
          
          {/* Meta info */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {solicitud.profiles?.full_name && (
              <span className="text-xs text-muted-foreground">👤 {solicitud.profiles.full_name}</span>
            )}
            {solicitud.ciudad && (
              <span className="text-xs text-muted-foreground">📍 {solicitud.ciudad}</span>
            )}
          </div>

          {/* Due date chip */}
          {solicitud.estado === 'pendiente' && days !== null && (
            <div className="mt-2">
              {isOverdue ? (
                <Badge variant="destructive" className="text-[10px] h-5">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Vencida hace {Math.abs(days)}d
                </Badge>
              ) : isUrgent ? (
                <Badge variant="outline" className="text-[10px] h-5 border-warning text-warning">
                  <Clock className="w-3 h-3 mr-1" />
                  {days === 0 ? 'Hoy' : `${days}d`}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">{days}d restantes</span>
              )}
            </div>
          )}
        </div>

        {/* New comment indicator */}
        {solicitud.decision_has_new_comment && (
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>

      {/* Date footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(solicitud.fecha_creacion), 'dd MMM', { locale: es })}
        </span>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: typeof COLUMNS[0];
  solicitudes: Solicitud[];
  onOpenDetails: (solicitud: Solicitud) => void;
}

function KanbanColumn({ column, solicitudes, onOpenDetails }: KanbanColumnProps) {
  const ColumnIcon = column.icon;
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 ${column.color} min-h-[500px] transition-all duration-200 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ColumnIcon className={`w-5 h-5 ${column.iconColor}`} />
            <h3 className="font-semibold">{column.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {solicitudes.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <SortableContext items={solicitudes.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {solicitudes.map((solicitud) => (
            <SolicitudCard
              key={solicitud.id}
              solicitud={solicitud}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </SortableContext>

        {solicitudes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <ColumnIcon className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Sin solicitudes</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SolicitudesKanbanProps {
  solicitudes: Solicitud[];
  onRefresh: () => void;
  onOpenDetails: (solicitud: Solicitud) => void;
  onStatusChange?: (solicitudId: string, newStatus: 'pendiente' | 'aprobada' | 'denegada') => void;
}

export function SolicitudesKanban({ solicitudes, onRefresh, onOpenDetails, onStatusChange }: SolicitudesKanbanProps) {
  const { fireCelebration } = useConfetti();
  const [draggedItem, setDraggedItem] = useState<Solicitud | null>(null);

  // Filter out archived solicitudes for kanban
  const activeSolicitudes = solicitudes.filter(s => !s.archived);

  const handleDragStart = (event: DragStartEvent) => {
    const solicitud = activeSolicitudes.find(s => s.id === event.active.id);
    setDraggedItem(solicitud || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a column
    const targetColumn = COLUMNS.find(col => col.id === overId);
    if (targetColumn) {
      const solicitud = activeSolicitudes.find(s => s.id === activeId);
      if (solicitud && solicitud.estado !== targetColumn.id) {
        await updateStatus(activeId, targetColumn.id as 'pendiente' | 'aprobada' | 'denegada');
      }
      return;
    }

    // Check if dropping on another card (to determine column)
    const targetSolicitud = activeSolicitudes.find(s => s.id === overId);
    if (targetSolicitud) {
      const sourceSolicitud = activeSolicitudes.find(s => s.id === activeId);
      if (sourceSolicitud && sourceSolicitud.estado !== targetSolicitud.estado) {
        await updateStatus(activeId, targetSolicitud.estado);
      }
    }
  };

  const updateStatus = async (solicitudId: string, newStatus: 'pendiente' | 'aprobada' | 'denegada') => {
    // If onStatusChange is provided, use it (for comment dialog)
    if (onStatusChange) {
      onStatusChange(solicitudId, newStatus);
      return;
    }

    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ 
          estado: newStatus,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: 'Estado actualizado',
        description: `Solicitud movida a ${COLUMNS.find(c => c.id === newStatus)?.label}`,
      });

      if (newStatus === 'aprobada') {
        fireCelebration();
      }

      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const getColumnSolicitudes = (columnId: string) => {
    return activeSolicitudes.filter(s => s.estado === columnId);
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((column) => (
          <div key={column.id} id={column.id}>
            <KanbanColumn
              column={column}
              solicitudes={getColumnSolicitudes(column.id)}
              onOpenDetails={onOpenDetails}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {draggedItem && (
          <div className="bg-card border rounded-xl p-3 shadow-large opacity-90 rotate-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${getTypeConfig(draggedItem.tipo).color} flex items-center justify-center`}>
                {(() => {
                  const Icon = getTypeConfig(draggedItem.tipo).icon;
                  return <Icon className="w-4 h-4 text-white" />;
                })()}
              </div>
              <div>
                <h4 className="font-medium text-sm">{draggedItem.nombre_solicitante}</h4>
                <p className="text-xs text-muted-foreground">{getTypeConfig(draggedItem.tipo).label}</p>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
