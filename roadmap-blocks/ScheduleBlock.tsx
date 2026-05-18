import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Pencil, Music, Utensils, Hotel, Plane, Users, Clock, GripVertical, X, AlertTriangle } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamMemberSelector } from './TeamMemberSelector';
import { InlineEditCell, InlineSelectCell } from '@/components/ui/inline-edit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activityType: string;
  title: string;
  location: string;
  notes: string;
  assignedMemberIds?: string[];
}

interface ScheduleDay {
  id: string;
  label: string;
  date: string;
  items: ScheduleItem[];
}

interface BookingInfo {
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  city?: string;
  tourTitle?: string;
  formato?: string;
}

export interface ScheduleBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  tourDates?: string[];
  bookingInfo?: BookingInfo;
  artistId?: string | null;
  bookingId?: string | null;
  onShowTimeChange?: (newTime: string) => void;
}

interface ScheduleBlockData {
  days?: ScheduleDay[];
}

const activityTypes = [
  { value: 'travel', label: 'Viaje', icon: Plane, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'soundcheck', label: 'Soundcheck', icon: Music, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'rehearsal', label: 'Ensayo', icon: Music, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'show', label: 'Show', icon: Music, color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'meal', label: 'Comida', icon: Utensils, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'hotel', label: 'Hotel', icon: Hotel, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'apartment', label: 'Apartamento', icon: Hotel, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'meeting', label: 'Reunión', icon: Users, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'other', label: 'Otro', icon: Clock, color: 'bg-muted text-muted-foreground border-muted' },
];

const getActivityConfig = (type: string) => {
  return activityTypes.find(a => a.value === type) || activityTypes[activityTypes.length - 1];
};

/** Sort schedule items by startTime ascending; items without a time go to the end */
function sortByTime(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });
}

/** Check if items are in chronological order (ignoring items without a time) */
function isChronological(items: ScheduleItem[]): boolean {
  let lastTime = '';
  for (const item of items) {
    if (!item.startTime) continue;
    if (lastTime && item.startTime < lastTime) return false;
    lastTime = item.startTime;
  }
  return true;
}

/** Find the first pair that breaks chronological order */
function findFirstBreak(items: ScheduleItem[]): { before: ScheduleItem; after: ScheduleItem } | null {
  let lastWithTime: ScheduleItem | null = null;
  for (const item of items) {
    if (!item.startTime) continue;
    if (lastWithTime && item.startTime < lastWithTime.startTime) {
      return { before: lastWithTime, after: item };
    }
    lastWithTime = item;
  }
  return null;
}

interface SortableScheduleRowProps {
  item: ScheduleItem;
  dayId: string;
  updateItem: (dayId: string, itemId: string, field: keyof ScheduleItem, value: unknown) => void;
  removeItem: (dayId: string, itemId: string) => void;
  openAssignmentEditor: (dayId: string, itemId: string, currentIds: string[]) => void;
  bookingInfo?: BookingInfo;
  artistId?: string | null;
}

function SortableScheduleRow({ item, dayId, updateItem, removeItem, openAssignmentEditor, bookingInfo, artistId }: SortableScheduleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const config = getActivityConfig(item.activityType);
  const assignedCount = item.assignedMemberIds?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[24px_80px_120px_1fr_1fr_1fr_120px_auto] gap-2 p-2 items-center hover:bg-muted/30 group"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <InlineEditCell
        value={item.startTime}
        onChange={(v) => updateItem(dayId, item.id, 'startTime', v)}
        placeholder="00:00"
        type="time"
        className="font-mono text-lg"
      />
      <InlineSelectCell
        value={item.activityType}
        onChange={(v) => {
          const newConfig = getActivityConfig(v);
          updateItem(dayId, item.id, 'activityType', v);
          if (!item.title) updateItem(dayId, item.id, 'title', newConfig.label);
          // Auto-fill location for show/soundcheck
          if ((v === 'show' || v === 'soundcheck') && !item.location && bookingInfo?.venue) {
            updateItem(dayId, item.id, 'location', bookingInfo.venue);
          }
        }}
        options={activityTypes}
        renderValue={(opt) => (
          <Badge variant="outline" className={`${opt ? getActivityConfig(opt.value).color : ''} gap-1`}>
            {opt?.icon && <opt.icon className="w-3 h-3" />}
            {opt?.label || 'Tipo'}
          </Badge>
        )}
      />
      <InlineEditCell
        value={item.title}
        onChange={(v) => updateItem(dayId, item.id, 'title', v)}
        placeholder="Título"
        className="font-medium"
      />
      <LocationAutocomplete
        artistId={artistId}
        value={item.location}
        onChange={(v) => updateItem(dayId, item.id, 'location', v)}
        placeholder="Ubicación"
      />
      <InlineEditCell
        value={item.notes}
        onChange={(v) => updateItem(dayId, item.id, 'notes', v)}
        placeholder="Notas"
        className="text-muted-foreground"
      />
      <Button
        variant="ghost"
        size="sm"
        className="justify-start h-8 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => openAssignmentEditor(dayId, item.id, item.assignedMemberIds || [])}
      >
        <Users className="w-3 h-3 mr-1" />
        {assignedCount > 0 ? (
          <span className="text-xs">{assignedCount} asignado{assignedCount > 1 ? 's' : ''}</span>
        ) : (
          <span className="text-xs">Asignar</span>
        )}
      </Button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => removeItem(dayId, item.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function ScheduleBlock({ data, onChange, tourDates, bookingInfo, artistId, bookingId, onShowTimeChange }: ScheduleBlockProps) {
  const blockData = data as ScheduleBlockData;
  const incomingDays = useMemo(() => blockData.days || [], [blockData.days]);

  const [localDays, setLocalDays] = useState<ScheduleDay[]>(incomingDays);
  const [activeDay, setActiveDay] = useState(incomingDays[0]?.id || '');
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('');
  const [newDayDate, setNewDayDate] = useState('');
  const [editingAssignments, setEditingAssignments] = useState<{ dayId: string; itemId: string } | null>(null);
  const [tempAssignedIds, setTempAssignedIds] = useState<string[]>([]);
  const [pendingSyncTime, setPendingSyncTime] = useState<string | null>(null);
  const [pendingReorder, setPendingReorder] = useState<{ dayId: string; items: ScheduleItem[]; movedItem: ScheduleItem; conflictItem: ScheduleItem } | null>(null);

  const lastSyncedRef = useRef<string>(JSON.stringify(incomingDays));
  const debouncedDays = useDebounce(localDays, 500);
  const hasAutoInitialized = useRef(false);

  // Auto-initialize days from tour dates
  useEffect(() => {
    if (!tourDates || tourDates.length === 0) return;
    
    const sortedDates = [...tourDates].sort();
    
    if (!hasAutoInitialized.current && incomingDays.length === 0) {
      hasAutoInitialized.current = true;
      const newDays: ScheduleDay[] = sortedDates.map((date) => {
        const items: ScheduleItem[] = [];
        const isShowDay = bookingInfo?.eventDate === date;
        
        if (isShowDay && bookingInfo?.eventTime) {
          items.push({
            id: crypto.randomUUID(),
            startTime: bookingInfo.eventTime,
            endTime: '',
            activityType: 'show',
            title: bookingInfo.tourTitle || 'Concierto',
            location: bookingInfo.venue || '',
            notes: bookingInfo.city || '',
          });
        }
        
        return {
          id: crypto.randomUUID(),
          label: isShowDay ? 'Show' : 'Day Off',
          date,
          items,
        };
      });
      setLocalDays(newDays);
      setActiveDay(newDays[0]?.id || '');
    }
  }, [incomingDays.length, tourDates, bookingInfo]);

  useEffect(() => {
    const next = JSON.stringify(incomingDays);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalDays(incomingDays);
      setActiveDay((prev) => {
        const exists = incomingDays.some((d) => d.id === prev);
        return exists ? prev : (incomingDays[0]?.id || '');
      });
    }
  }, [incomingDays]);

  useEffect(() => {
    const next = JSON.stringify(debouncedDays);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, days: debouncedDays });
    }
  }, [debouncedDays]);

  const addDay = () => {
    if (!newDayLabel.trim()) return;
    const newDay: ScheduleDay = {
      id: crypto.randomUUID(),
      label: newDayLabel,
      date: newDayDate,
      items: [],
    };
    setLocalDays((prev) => [...prev, newDay]);
    setActiveDay(newDay.id);
    setIsAddingDay(false);
    setNewDayLabel('');
    setNewDayDate('');
  };

  const updateDay = (dayId: string, updates: Partial<ScheduleDay>) => {
    setLocalDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, ...updates } : d)));
  };

  const removeDay = (dayId: string) => {
    setLocalDays((prev) => {
      const next = prev.filter((d) => d.id !== dayId);
      setActiveDay((current) => {
        if (current !== dayId) return current;
        return next[0]?.id || '';
      });
      return next;
    });
  };

  const addItem = (dayId: string) => {
    const day = localDays.find((d) => d.id === dayId);
    let defaultStartTime = '';
    
    if (day && day.items.length > 0) {
      const lastItem = day.items[day.items.length - 1];
      defaultStartTime = lastItem.endTime || lastItem.startTime || '';
    }

    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      startTime: defaultStartTime,
      endTime: '',
      activityType: 'other',
      title: '',
      location: '',
      notes: '',
      assignedMemberIds: [],
    };

    setLocalDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const updatedItems = [...d.items, newItem];
        return { ...d, items: sortByTime(updatedItems) };
      })
    );
  };


  const updateItem = (dayId: string, itemId: string, field: keyof ScheduleItem, value: unknown) => {
    // Detect show time change to offer sync
    if (field === 'startTime' && onShowTimeChange) {
      const day = localDays.find(d => d.id === dayId);
      const item = day?.items.find(i => i.id === itemId);
      if (item?.activityType === 'show' && typeof value === 'string' && value !== item.startTime) {
        setPendingSyncTime(value);
      }
    }

    setLocalDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const updatedItems = d.items.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        );
        // Auto-sort when time changes
        if (field === 'startTime') {
          return { ...d, items: sortByTime(updatedItems) };
        }
        return { ...d, items: updatedItems };
      })
    );
  };

  const removeItem = (dayId: string, itemId: string) => {
    setLocalDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, items: d.items.filter((i) => i.id !== itemId) } : d))
    );
  };

  const openAssignmentEditor = (dayId: string, itemId: string, currentIds: string[]) => {
    setEditingAssignments({ dayId, itemId });
    setTempAssignedIds(currentIds || []);
  };

  const saveAssignments = () => {
    if (editingAssignments) {
      updateItem(editingAssignments.dayId, editingAssignments.itemId, 'assignedMemberIds', tempAssignedIds);
      setEditingAssignments(null);
    }
  };

  const currentDay = localDays.find((d) => d.id === activeDay);

  const displayItems = currentDay?.items || [];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), "EEEE d 'de' MMMM yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentDay) return;
    const oldIndex = currentDay.items.findIndex(i => i.id === active.id);
    const newIndex = currentDay.items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newItems = arrayMove(currentDay.items, oldIndex, newIndex);
    
    if (!isChronological(newItems)) {
      const breakInfo = findFirstBreak(newItems);
      if (breakInfo) {
        setPendingReorder({
          dayId: currentDay.id,
          items: newItems,
          movedItem: breakInfo.after,
          conflictItem: breakInfo.before,
        });
        return;
      }
    }
    updateDay(currentDay.id, { items: newItems });
  };

  return (
    <div className="space-y-4">
      {localDays.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hay días configurados</p>
          <Button onClick={() => setIsAddingDay(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Añadir Día
          </Button>
        </div>
      ) : (
        <>
          {/* Day tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {localDays.map((day) => (
              <Button
                key={day.id}
                variant={activeDay === day.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveDay(day.id)}
                className="relative group"
              >
                {day.label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDay(day.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      removeDay(day.id);
                    }
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                >
                  ×
                </span>
              </Button>
            ))}
            <Button onClick={() => setIsAddingDay(true)} variant="ghost" size="sm" className="gap-1">
              <Plus className="w-3 h-3" />
              Día
            </Button>
          </div>

          {/* Current day content */}
          {currentDay && (
            <div className="space-y-4">
              {/* Day header - visual style */}
              <div className="bg-primary rounded-lg p-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg uppercase">{currentDay.label}</h3>
                    {currentDay.date && (
                      <p className="text-sm opacity-90">{formatDate(currentDay.date)}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={() => {
                      const newLabel = prompt('Nombre del día:', currentDay.label);
                      if (newLabel) updateDay(currentDay.id, { label: newLabel });
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Schedule table - inline editable */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[24px_80px_120px_1fr_1fr_1fr_120px_auto] gap-2 p-3 bg-muted/50 font-medium text-sm">
                  <div></div>
                  <div>HORA</div>
                  <div>ACTIVIDAD</div>
                  <div>TÍTULO</div>
                  <div>UBICACIÓN</div>
                  <div>NOTAS</div>
                  <div>EQUIPO</div>
                  <div></div>
                </div>
                
                {displayItems.length > 0 ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={displayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="divide-y">
                        {displayItems.map((item) => (
                          <SortableScheduleRow
                            key={item.id}
                            item={item}
                            dayId={currentDay.id}
                            updateItem={updateItem}
                            removeItem={removeItem}
                            openAssignmentEditor={openAssignmentEditor}
                            bookingInfo={bookingInfo}
                            artistId={artistId}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay actividades para este día
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => addItem(currentDay.id)}
              >
                <Plus className="w-4 h-4" />
                Añadir Actividad
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add Day Dialog */}
      <Dialog open={isAddingDay} onOpenChange={setIsAddingDay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Día</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del día</Label>
              <Input
                value={newDayLabel}
                onChange={(e) => setNewDayLabel(e.target.value)}
                placeholder="Ej: Show, Day Off, Viaje..."
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingDay(false)}>Cancelar</Button>
            <Button onClick={addDay} disabled={!newDayLabel.trim()}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignments Dialog */}
      <Dialog open={!!editingAssignments} onOpenChange={(open) => !open && setEditingAssignments(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Equipo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Asignados</Label>
                {bookingInfo?.formato && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Formato: {bookingInfo.formato}
                  </Badge>
                )}
              </div>
              <TeamMemberSelector
                artistId={artistId}
                bookingId={bookingId}
                value={tempAssignedIds}
                onValueChange={setTempAssignedIds}
                placeholder="Seleccionar equipo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignments(null)}>Cancelar</Button>
            <Button onClick={saveAssignments}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Show Time Confirmation Dialog */}
      <Dialog open={!!pendingSyncTime} onOpenChange={() => {}}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="[&>button:last-child]:hidden">
          <DialogHeader>
            <DialogTitle>Sincronizar hora del evento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Has cambiado la hora del show a <span className="font-semibold text-foreground">{pendingSyncTime}</span>. ¿Quieres actualizar también la hora del evento vinculado?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingSyncTime(null)}>
              No, solo en la hoja de ruta
            </Button>
            <Button onClick={() => {
              if (pendingSyncTime && onShowTimeChange) {
                onShowTimeChange(pendingSyncTime);
              }
              setPendingSyncTime(null);
            }}>
              Sí, actualizar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chronological reorder confirmation */}
      <AlertDialog open={!!pendingReorder} onOpenChange={(open) => !open && setPendingReorder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <AlertDialogTitle>Orden no cronológico</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              {pendingReorder && (
                <>
                  La actividad "<span className="font-semibold text-foreground">{pendingReorder.movedItem.title || pendingReorder.movedItem.activityType}</span>" ({pendingReorder.movedItem.startTime}) quedará después de "<span className="font-semibold text-foreground">{pendingReorder.conflictItem.title || pendingReorder.conflictItem.activityType}</span>" ({pendingReorder.conflictItem.startTime}).
                  <br />Esto rompe el orden cronológico. ¿Estás seguro?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (pendingReorder) {
                updateDay(pendingReorder.dayId, { items: pendingReorder.items });
                setPendingReorder(null);
              }
            }}>
              Forzar este orden
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingReorder) {
                const sorted = sortByTime(pendingReorder.items);
                updateDay(pendingReorder.dayId, { items: sorted });
                setPendingReorder(null);
              }
            }}>
              Mantener orden cronológico
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
