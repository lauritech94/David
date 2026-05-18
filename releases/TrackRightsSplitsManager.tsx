import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X, FileText, Music, User, UserPlus, Search, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GroupedRoleSelect } from '@/components/credits/GroupedRoleSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { PROCombobox } from '@/components/credits/PROCombobox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CreditNotesEditor, CreditNoteBadge } from '@/components/credits/CreditNotesEditor';
import { isValidIPI } from '@/lib/pros';
import { toast } from 'sonner';
import { undoableDelete } from '@/utils/undoableDelete';
import { useTrackCredits, TrackCredit, Track } from '@/hooks/useReleases';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  PUBLISHING_ROLES,
  MASTER_ROLES,
  PUBLISHING_ROLE_VALUES,
  MASTER_ROLE_VALUES,
  getRoleLabel,
} from '@/lib/creditRoles';

// Helper: round to nearest step
function roundToStep(value: number, step = 0.5): number {
  return Math.round(value / step) * step;
}

/**
 * Redistribuye proporcionalmente los porcentajes existentes para hacer hueco a `newPct`.
 * Devuelve los nuevos valores (mismo orden que `existing`) y el `remainder` que queda
 * por compensar tras redondear al `step` (positivo = hay que restar más; negativo = hay que sumar).
 */
function redistributeSplits(
  existing: { id: string; pct: number }[],
  newPct: number,
  step = 0.5,
): { newValues: { id: string; pct: number }[]; remainder: number } {
  const target = Math.max(0, 100 - newPct);
  const currentTotal = existing.reduce((s, e) => s + e.pct, 0);

  let raw: number[];
  if (currentTotal <= 0) {
    // Reparto equitativo si no había nada
    const each = existing.length > 0 ? target / existing.length : 0;
    raw = existing.map(() => each);
  } else {
    raw = existing.map((e) => (e.pct / currentTotal) * target);
  }

  // Redondear al step (a la baja para no pasarse del target)
  const rounded = raw.map((v) => Math.max(0, Math.floor(v / step) * step));
  const sumRounded = rounded.reduce((s, v) => s + v, 0);
  const remainder = +(target - sumRounded).toFixed(4); // positivo: queda por repartir al alza

  return {
    newValues: existing.map((e, i) => ({ id: e.id, pct: +rounded[i].toFixed(4) })),
    remainder,
  };
}

interface TrackRightsSplitsManagerProps {
  track: Track;
  type: 'publishing' | 'master';
  /** Si se proporciona, habilita la edición de notas por canción para este release. */
  releaseId?: string;
  /** Workspace para sociedades de gestión personalizadas. */
  workspaceId?: string | null;
}

export function TrackRightsSplitsManager({ track, type, releaseId, workspaceId }: TrackRightsSplitsManagerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string | null>(workspaceId ?? null);

  // Resolve workspace_id from release if not provided
  useEffect(() => {
    if (workspaceId) { setResolvedWorkspaceId(workspaceId); return; }
    if (!releaseId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('releases')
        .select('artist:artists(workspace_id)')
        .eq('id', releaseId)
        .maybeSingle();
      if (cancelled) return;
      const wid = (data as any)?.artist?.workspace_id ?? null;
      setResolvedWorkspaceId(wid);
    })();
    return () => { cancelled = true; };
  }, [workspaceId, releaseId]);


  // Use existing track_credits data
  const { data: allCredits = [] } = useTrackCredits(track.id);

  // Filter credits by the specific percentage column (publishing or master)
  const percentageKey = type === 'publishing' ? 'publishing_percentage' : 'master_percentage';
  
  const splits = useMemo(() => {
    return allCredits.filter(credit => 
      credit[percentageKey] !== null && credit[percentageKey]! > 0
    );
  }, [allCredits, percentageKey]);

  const totalPercentage = splits.reduce((sum, s) => sum + (s[percentageKey] || 0), 0);
  const isComplete = totalPercentage === 100;

  const roles = type === 'publishing' ? PUBLISHING_ROLES : MASTER_ROLES;
  const Icon = type === 'publishing' ? FileText : Music;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = splits.findIndex(s => s.id === active.id);
    const newIndex = splits.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(splits, oldIndex, newIndex);

    // Persist new sort_order
    const updates = reordered.map((item, index) => 
      supabase.from('track_credits').update({ sort_order: index }).eq('id', item.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
  }, [splits, queryClient, track.id]);

  // Create credit mutation
  const createCredit = useMutation({
    mutationFn: async (data: Omit<TrackCredit, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('track_credits').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito añadido');
    },
    onError: () => {
      toast.error('Error al añadir');
    },
  });

  // Update credit mutation
  const updateCredit = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrackCredit> & { id: string }) => {
      const { error } = await supabase.from('track_credits').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  // Delete credit mutation
  const deleteCredit = useMutation({
    mutationFn: async (id: string) => {
      await undoableDelete({
        table: 'track_credits',
        id,
        successMessage: 'Crédito eliminado',
        onComplete: () => {
          queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
        },
      });
    },
  });

  const handleCreate = async (data: any) => {
    await createCredit.mutateAsync({ ...data, track_id: track.id });
    setIsAdding(false);
  };

  // Estado para el diálogo de redistribución con redondeo
  const [redistributePending, setRedistributePending] = useState<{
    newCreditData: any;
    baseUpdates: { id: string; pct: number }[];
    remainder: number;
    candidates: { id: string; name: string; pct: number }[];
  } | null>(null);
  const [roundingTargets, setRoundingTargets] = useState<string[]>([]);

  const applyRedistribution = async (
    newCreditData: any,
    finalUpdates: { id: string; pct: number }[],
  ) => {
    // 1) Actualizar existentes
    await Promise.all(
      finalUpdates.map((u) =>
        supabase.from('track_credits').update({ [percentageKey]: u.pct }).eq('id', u.id),
      ),
    );
    // 2) Crear el nuevo
    await supabase.from('track_credits').insert({ ...newCreditData, track_id: track.id });
    queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
    toast.success('Crédito añadido y porcentajes ajustados');
    setIsAdding(false);
  };

  const handleCreateWithRedistribute = async (data: any) => {
    const newPct = Number(data[percentageKey]) || 0;
    if (newPct <= 0 || splits.length === 0) {
      // Nada que repartir
      await handleCreate(data);
      return;
    }
    if (newPct > 100) {
      toast.error('El porcentaje no puede ser mayor a 100%');
      return;
    }

    const existing = splits.map((s) => ({ id: s.id, pct: Number(s[percentageKey]) || 0 }));
    const { newValues, remainder } = redistributeSplits(existing, newPct, 0.5);

    if (remainder <= 0.0001) {
      await applyRedistribution(data, newValues);
      return;
    }

    // Hay sobrante: si solo hay 1 existente, dárselo entero
    if (existing.length === 1) {
      const finalUpdates = newValues.map((v) => ({ ...v, pct: +(v.pct + remainder).toFixed(4) }));
      await applyRedistribution(data, finalUpdates);
      return;
    }

    // Abrir diálogo para elegir destinatarios del sobrante
    const candidates = splits.map((s) => ({
      id: s.id,
      name: s.name || 'Sin nombre',
      pct: newValues.find((v) => v.id === s.id)?.pct ?? 0,
    }));
    setRedistributePending({ newCreditData: data, baseUpdates: newValues, remainder, candidates });
    setRoundingTargets([candidates[0].id]); // Pre-selección: primero
  };

  const confirmRedistribution = async () => {
    if (!redistributePending) return;
    const { newCreditData, baseUpdates, remainder, candidates } = redistributePending;
    const targets = roundingTargets.length > 0 ? roundingTargets : [candidates[0].id];
    const perTarget = +(remainder / targets.length).toFixed(4);
    // Repartir el sobrante en pasos de 0.5 entre los targets seleccionados
    const finalUpdates = baseUpdates.map((u) =>
      targets.includes(u.id) ? { ...u, pct: +(u.pct + perTarget).toFixed(4) } : u,
    );
    setRedistributePending(null);
    setRoundingTargets([]);
    await applyRedistribution(newCreditData, finalUpdates);
  };


  const handleUpdate = async (id: string, data: any) => {
    await updateCredit.mutateAsync({ id, ...data });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteCredit.mutateAsync(id);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${type === 'publishing' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
            <Icon className={`h-4 w-4 ${type === 'publishing' ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <p className="font-medium text-sm flex items-center gap-1.5">
              {track.title} — {type === 'publishing' ? 'Derechos de Autor' : 'Royalties Master'}
              {releaseId && <CreditNoteBadge releaseId={releaseId} scope={type} trackId={track.id} />}
            </p>
            <p className="text-xs text-muted-foreground">
              {splits.length} {splits.length === 1 ? 'participante' : 'participantes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={isComplete ? 'default' : 'outline'} 
            className={isComplete ? 'bg-green-500' : totalPercentage > 100 ? 'border-red-500 text-red-500' : ''}
          >
            {totalPercentage}%
          </Badge>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pl-4 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <Progress 
            value={Math.min(totalPercentage, 100)} 
            className={`h-2 ${totalPercentage > 100 ? '[&>div]:bg-red-500' : ''}`}
          />
          <p className="text-xs text-muted-foreground">
            {isComplete ? '✓ Completo' : `${100 - totalPercentage}% restante`}
          </p>
        </div>

        {/* Existing splits */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={splits.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {splits.map((credit) => (
              <SortableSplitRow
                key={credit.id}
                credit={credit}
                type={type}
                percentageKey={percentageKey}
                roles={roles}
                workspaceId={resolvedWorkspaceId}
                isEditing={editingId === credit.id}
                onEdit={() => setEditingId(credit.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(data) => handleUpdate(credit.id, data)}
                onDelete={() => handleDelete(credit.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add new split form */}
        {isAdding ? (
          <AddSplitForm
            type={type}
            percentageKey={percentageKey}
            roles={roles}
            workspaceId={resolvedWorkspaceId}
            onSave={handleCreate}
            onSaveWithRedistribute={handleCreateWithRedistribute}
            hasExistingSplits={splits.length > 0}
            onCancel={() => setIsAdding(false)}
            isLoading={createCredit.isPending}
          />
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir {type === 'publishing' ? 'autor' : 'participante'}
          </Button>
        )}

        {releaseId && (
          <div className="pt-2 border-t">
            <CreditNotesEditor
              releaseId={releaseId}
              scope={type}
              trackId={track.id}
              variant="inline"
              placeholder={`Notas sobre ${type === 'publishing' ? 'autoría' : 'master'} de esta canción…`}
            />
          </div>
        )}
      </CollapsibleContent>

      {/* Diálogo para elegir destinatario del sobrante por redondeo */}
      <Dialog
        open={!!redistributePending}
        onOpenChange={(open) => {
          if (!open) {
            setRedistributePending(null);
            setRoundingTargets([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar el porcentaje sobrante</DialogTitle>
            <DialogDescription>
              Tras repartir proporcionalmente queda un sobrante de{' '}
              <strong>{redistributePending?.remainder.toFixed(2)}%</strong>. Elige a quién(es)
              asignárselo (se reparte en partes iguales entre los seleccionados).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[40vh] overflow-y-auto">
            {redistributePending?.candidates.map((c) => {
              const checked = roundingTargets.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded border hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      setRoundingTargets((prev) =>
                        v ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      );
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tras repartir: {c.pct.toFixed(2)}%
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRedistributePending(null);
                setRoundingTargets([]);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmRedistribution} disabled={roundingTargets.length === 0}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

// Sortable wrapper for SplitRow
function SortableSplitRow(props: Parameters<typeof SplitRow>[0]) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.credit.id, disabled: props.isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SplitRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// Split Row Component
function SplitRow({
  credit,
  type,
  percentageKey,
  roles,
  workspaceId,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  dragHandleProps,
}: {
  credit: TrackCredit;
  type: 'publishing' | 'master';
  percentageKey: 'publishing_percentage' | 'master_percentage';
  roles: { value: string; label: string }[];
  workspaceId?: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, any>;
}) {
  const [editName, setEditName] = useState(credit.name);
  const [editRole, setEditRole] = useState(credit.role);
  const [editPercentage, setEditPercentage] = useState(credit[percentageKey] || 0);
  const [editProSociety, setEditProSociety] = useState(credit.pro_society || '');
  const [editNotes, setEditNotes] = useState(credit.notes || '');

  const handleSave = () => {
    onSave({
      name: editName,
      role: editRole,
      [percentageKey]: editPercentage,
      ...(type === 'publishing' ? { pro_society: editProSociety || null, notes: editNotes || null } : {}),
    });
  };

  const roleLabel = getRoleLabel(credit.role);

  if (isEditing) {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre"
          />
          <GroupedRoleSelect value={editRole} onValueChange={setEditRole} filterType={type} />
        </div>
        <div className="flex items-center gap-4">
          <Slider
            value={[editPercentage]}
            onValueChange={([val]) => setEditPercentage(val)}
            max={100}
            step={0.5}
            className="flex-1"
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={editPercentage}
              onChange={(e) => setEditPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-20 text-right h-8"
            />
            <span className="text-sm font-medium">%</span>
          </div>
        </div>
        {type === 'publishing' && (
          <div className="grid grid-cols-2 gap-3">
            <PROCombobox
              value={editProSociety}
              onValueChange={setEditProSociety}
              workspaceId={workspaceId}
              placeholder="Sociedad (PRO)…"
            />
            <Input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notas — ej. Dominio Público"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground hover:text-foreground"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          credit.contact_id ? 'bg-primary/10' : 'bg-muted'
        }`}>
          <User className={`h-4 w-4 ${credit.contact_id ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{credit.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
            {credit.contact_id && (
              <Badge variant="secondary" className="text-xs bg-primary/10">
                Vinculado
              </Badge>
            )}
            {type === 'publishing' && credit.pro_society && (
              <Badge variant="secondary" className="text-xs">{credit.pro_society}</Badge>
            )}
          </div>
          {type === 'publishing' && credit.notes && (
            <p className="text-xs text-muted-foreground italic mt-0.5">{credit.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{credit[percentageKey] || 0}%</Badge>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Contact interface
interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

// Add Split Form with Contact Selection
function AddSplitForm({
  type,
  percentageKey,
  roles,
  workspaceId,
  onSave,
  onSaveWithRedistribute,
  hasExistingSplits,
  onCancel,
  isLoading,
}: {
  type: 'publishing' | 'master';
  percentageKey: 'publishing_percentage' | 'master_percentage';
  roles: { value: string; label: string }[];
  workspaceId?: string | null;
  onSave: (data: any) => void;
  onSaveWithRedistribute?: (data: any) => void;
  hasExistingSplits?: boolean;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<'select' | 'create' | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(roles[0]?.value || '');
  const [percentage, setPercentage] = useState(50);
  const [proSociety, setProSociety] = useState('');
  const [creditNotes, setCreditNotes] = useState('');

  useEffect(() => {
    if (mode === 'select') {
      fetchContacts();
    }
  }, [mode]);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, stage_name, email, phone, company')
        .order('name', { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleCreateContactAndSave = async (useRedistribute = false) => {
    if (!name || !role) return;

    try {
      // Create contact first
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          created_by: profile?.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      const publishingFields = type === 'publishing' ? { pro_society: proSociety || null, notes: creditNotes || null } : {};
      const payload = {
        name,
        role,
        [percentageKey]: percentage,
        contact_id: newContact.id,
        ...publishingFields,
      };
      if (useRedistribute && onSaveWithRedistribute) {
        onSaveWithRedistribute(payload);
      } else {
        onSave(payload);
      }
      toast.success('Contacto creado y vinculado');
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Error al crear el contacto');
    }
  };

  const handleSelectContactAndSave = (useRedistribute = false) => {
    if (!selectedContactId || !role) return;

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    const publishingFields = type === 'publishing' ? { pro_society: proSociety || null, notes: creditNotes || null } : {};
    const payload = {
      name: contact.stage_name || contact.name,
      role,
      [percentageKey]: percentage,
      contact_id: selectedContactId,
      ...publishingFields,
    };
    if (useRedistribute && onSaveWithRedistribute) {
      onSaveWithRedistribute(payload);
    } else {
      onSave(payload);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initial mode selection
  if (mode === null) {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
        <p className="text-sm text-muted-foreground text-center mb-2">
          ¿Cómo quieres añadir el participante?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => setMode('select')}
          >
            <Search className="h-5 w-5" />
            <span className="text-sm">Desde la Agenda</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => setMode('create')}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-sm">Nuevo Perfil</span>
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Select from contacts mode
  if (mode === 'select') {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
            ← Volver
          </Button>
          <span className="text-sm font-medium">Seleccionar desde la Agenda</span>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar contacto..."
            className="pl-9"
          />
        </div>
        
        {/* Contact list */}
        <div className="max-h-40 overflow-y-auto space-y-1">
          {loadingContacts ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No se encontraron contactos</p>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-2 rounded cursor-pointer flex items-center gap-2 ${
                  selectedContactId === contact.id 
                    ? 'bg-primary/10 border border-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedContactId(contact.id)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contact.stage_name || contact.name}
                  </p>
                  {contact.email && (
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Role and percentage */}
        {selectedContactId && (
          <>
            <GroupedRoleSelect value={role} onValueChange={setRole} filterType={type} />
            <div className="flex items-center gap-4">
              <Label className="shrink-0">Porcentaje:</Label>
              <Slider
                value={[percentage]}
                onValueChange={([val]) => setPercentage(val)}
                max={100}
                step={0.5}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={percentage}
                  onChange={(e) => setPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-20 text-right h-8"
                />
                <span className="text-sm font-medium">%</span>
              </div>
            </div>
            {type === 'publishing' && (
              <div className="grid grid-cols-2 gap-3">
                <PROCombobox
                  value={proSociety}
                  onValueChange={setProSociety}
                  workspaceId={workspaceId}
                  placeholder="Sociedad (PRO)…"
                />
                <Input
                  value={creditNotes}
                  onChange={(e) => setCreditNotes(e.target.value)}
                  placeholder="Notas — ej. Dominio Público"
                />
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          {hasExistingSplits && onSaveWithRedistribute ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedContactId || isLoading}
                onClick={() => handleSelectContactAndSave(false)}
              >
                Añadir tal cual
              </Button>
              <Button
                size="sm"
                disabled={!selectedContactId || isLoading}
                onClick={() => handleSelectContactAndSave(true)}
              >
                Añadir y ajustar resto
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={!selectedContactId || isLoading}
              onClick={() => handleSelectContactAndSave(false)}
            >
              Añadir
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Create new contact mode
  return (
    <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
          ← Volver
        </Button>
        <span className="text-sm font-medium">Crear Nuevo Perfil</span>
      </div>
      
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre *"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (opcional)"
        type="email"
      />
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Teléfono (opcional)"
        type="tel"
      />
      <GroupedRoleSelect value={role} onValueChange={setRole} filterType={type} placeholder="Rol *" />
      <div className="flex items-center gap-4">
        <Label className="shrink-0">Porcentaje:</Label>
        <Slider
          value={[percentage]}
          onValueChange={([val]) => setPercentage(val)}
          max={100}
          step={0.5}
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={percentage}
            onChange={(e) => setPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            className="w-20 text-right h-8"
          />
          <span className="text-sm font-medium">%</span>
        </div>
      </div>
      {type === 'publishing' && (
        <div className="grid grid-cols-2 gap-3">
          <PROCombobox
            value={proSociety}
            onValueChange={setProSociety}
            workspaceId={workspaceId}
            placeholder="Sociedad (PRO)…"
          />
          <Input
            value={creditNotes}
            onChange={(e) => setCreditNotes(e.target.value)}
            placeholder="Notas — ej. Dominio Público"
          />
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        {hasExistingSplits && onSaveWithRedistribute ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!name || !role || isLoading}
              onClick={() => handleCreateContactAndSave(false)}
            >
              Crear y añadir tal cual
            </Button>
            <Button
              size="sm"
              disabled={!name || !role || isLoading}
              onClick={() => handleCreateContactAndSave(true)}
            >
              Crear y ajustar resto
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={!name || !role || isLoading}
            onClick={() => handleCreateContactAndSave(false)}
          >
            Crear y Añadir
          </Button>
        )}
      </div>
    </div>
  );
}
