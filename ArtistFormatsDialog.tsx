import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TeamMemberWithCategory } from '@/hooks/useTeamMembersByArtist';
import { useArtistTeamMembers } from '@/hooks/useArtistTeamMembers';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Trash2, Upload, Loader2, Users, Clock, Euro, 
  FileText, Music, GripVertical, Settings2, X, UserPlus, ChevronDown, Plane
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface CrewMember {
  memberId: string;
  memberType: 'workspace' | 'contact' | 'artist';
  roleLabel?: string;
  name: string;
  role?: string; // Role from contact/profile (e.g., "Bajo", "Técnico de sonido", "Manager")
  feeNational?: number;
  feeInternational?: number;
  isPercentage?: boolean;
  percentageNational?: number;
  percentageInternational?: number;
  isTourParty?: boolean; // Whether this member travels with the tour
}

type CrewSelectableMember = {
  id: string;
  name: string;
  role?: string;
  type: CrewMember['memberType'];
};

interface BookingProduct {
  id?: string;
  name: string;
  previousName?: string;
  description?: string;
  feeNational?: number;
  feeInternational?: number;
  crewMembers: CrewMember[];
  performanceDurationMinutes?: number;
  riderUrl?: string;
  hospitalityRequirements?: string;
}

interface ArtistFormatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
}

const PRESET_FORMATS = [
  { name: 'Acústico', crewSize: 2 },
  { name: 'Dúo', crewSize: 2 },
  { name: 'Trío', crewSize: 3 },
  { name: 'Cuarteto', crewSize: 4 },
  { name: 'Quinteto', crewSize: 5 },
  { name: 'Banda Completa', crewSize: 6 },
  { name: 'Full Band + Luces', crewSize: 8 },
  { name: 'DJ Set', crewSize: 1 },
];

// Parse number input preserving 0 as a valid value; empty string -> undefined
const parseNumInput = (raw: string): number | undefined => {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

// Sortable Crew Member Component
interface SortableCrewMemberProps {
  crew: CrewMember;
  formatIndex: number;
  onUpdateFeeNational: (formatIndex: number, memberId: string, fee: number | undefined) => void;
  onUpdateFeeInternational: (formatIndex: number, memberId: string, fee: number | undefined) => void;
  onUpdatePercentageNational: (formatIndex: number, memberId: string, pct: number | undefined) => void;
  onUpdatePercentageInternational: (formatIndex: number, memberId: string, pct: number | undefined) => void;
  onToggleIsPercentage: (formatIndex: number, memberId: string, isPercentage: boolean) => void;
  onToggleTourParty: (formatIndex: number, memberId: string, isTourParty: boolean) => void;
  onRemove: (formatIndex: number, memberId: string) => void;
}

function SortableCrewMember({ 
  crew, 
  formatIndex, 
  onUpdateFeeNational, 
  onUpdateFeeInternational,
  onUpdatePercentageNational,
  onUpdatePercentageInternational,
  onToggleIsPercentage,
  onToggleTourParty,
  onRemove 
}: SortableCrewMemberProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: crew.memberId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isPercentage = crew.isPercentage || false;
  const isTourParty = crew.isTourParty !== false; // Default to true

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 border border-border/50 gap-2 flex-wrap"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex flex-col min-w-[120px]">
          <span className="text-sm font-medium">{crew.name}</span>
          {crew.role && (
            <span className="text-xs text-muted-foreground">{crew.role}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Toggle between % and € */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={isPercentage ? "outline" : "default"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToggleIsPercentage(formatIndex, crew.memberId, false)}
          >
            € Caché
          </Button>
          <Button
            type="button"
            variant={isPercentage ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToggleIsPercentage(formatIndex, crew.memberId, true)}
          >
            % Fee
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Nac {isPercentage ? '%' : '€'}
          </Label>
          <Input
            type="number"
            step={isPercentage ? '0.5' : undefined}
            min={isPercentage ? '0' : undefined}
            max={isPercentage ? '100' : undefined}
            value={(isPercentage ? crew.percentageNational : crew.feeNational) ?? ''}
            onChange={(e) =>
              isPercentage
                ? onUpdatePercentageNational(formatIndex, crew.memberId, parseNumInput(e.target.value))
                : onUpdateFeeNational(formatIndex, crew.memberId, parseNumInput(e.target.value))
            }
            placeholder="0"
            className="w-20 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Int {isPercentage ? '%' : '€'}
          </Label>
          <Input
            type="number"
            step={isPercentage ? '0.5' : undefined}
            min={isPercentage ? '0' : undefined}
            max={isPercentage ? '100' : undefined}
            value={(isPercentage ? crew.percentageInternational : crew.feeInternational) ?? ''}
            onChange={(e) =>
              isPercentage
                ? onUpdatePercentageInternational(formatIndex, crew.memberId, parseNumInput(e.target.value))
                : onUpdateFeeInternational(formatIndex, crew.memberId, parseNumInput(e.target.value))
            }
            placeholder="0"
            className="w-20 h-8 text-sm"
          />
        </div>
        
        {/* Tour Party Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isTourParty ? "default" : "outline"}
              size="icon"
              className={`h-8 w-8 ${isTourParty ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-muted-foreground'}`}
              onClick={() => onToggleTourParty(formatIndex, crew.memberId, !isTourParty)}
            >
              <Plane className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isTourParty ? 'Viaja con el tour' : 'No viaja con el tour'}</p>
          </TooltipContent>
        </Tooltip>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(formatIndex, crew.memberId)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
// Sortable Format Card wrapper
function SortableFormatCard({ id, children }: { id: string; children: (dragListeners: Record<string, any>) => React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners ?? {})}
    </div>
  );
}

interface ArtistFormatsContentProps {
  artistId: string;
  artistName: string;
  onClose?: () => void;
}

export function ArtistFormatsContent({ artistId, artistName, onClose }: ArtistFormatsContentProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formats, setFormats] = useState<BookingProduct[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [selectingCrewForIndex, setSelectingCrewForIndex] = useState<number | null>(null);
  const [expandedFormats, setExpandedFormats] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Fetch team members for this artist (workspace members + contacts assigned to the artist)
  const selectedArtistIds = useMemo(() => (artistId ? [artistId] : []), [artistId]);
  const { members: filteredMembers, groupedByCategory, loading: loadingTeam } = useArtistTeamMembers(artistId);
  const allTeamMembers = filteredMembers;
  const loadingArtistTeam = loadingTeam;

  // All workspace contacts, used by the "Importar contacto" tab
  const { data: allContacts = [] } = useQuery({
    queryKey: ['all-contacts-for-format-crew', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Array<{ id: string; name: string; stage_name: string | null; category: string | null; role: string | null }>;
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, stage_name, category, role')
        .eq('created_by', user.id)
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; stage_name: string | null; category: string | null; role: string | null }>;
    },
    enabled: !!user?.id,
  });

  // Local UI state for the picker tabs
  const [crewPickerTab, setCrewPickerTab] = useState<'team' | 'import' | 'new'>('team');
  const [importQuery, setImportQuery] = useState('');
  const [importAssignToArtist, setImportAssignToArtist] = useState(true);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewRole, setNewCrewRole] = useState('');
  const [newCrewCategory, setNewCrewCategory] = useState<string>('banda');
  const [newCrewAssignToArtist, setNewCrewAssignToArtist] = useState(true);
  const [creatingNewCrew, setCreatingNewCrew] = useState(false);

  // Fetch artist profile data
  const { data: artistProfile } = useQuery({
    queryKey: ['artist-profile', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, profile_id, workspace_id')
        .eq('id', artistId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Fetch existing formats
  const { data: existingFormats, isLoading } = useQuery({
    queryKey: ['booking-products', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_products')
        .select('*')
        .eq('artist_id', artistId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Fetch crew assignments for existing formats
  const { data: existingCrew } = useQuery({
    queryKey: ['booking-product-crew', artistId],
    queryFn: async () => {
      if (!existingFormats || existingFormats.length === 0) return [];
      
      const productIds = existingFormats.map(f => f.id);
      const { data, error } = await supabase
        .from('booking_product_crew')
        .select('*')
        .in('booking_product_id', productIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!artistId && !!existingFormats && existingFormats.length > 0,
  });

  // Initialize formats from database
  useEffect(() => {
    if (existingFormats) {
      const crewByProduct = new Map<string, CrewMember[]>();
      
      if (existingCrew) {
        existingCrew.forEach((c: any) => {
          if (!crewByProduct.has(c.booking_product_id)) {
            crewByProduct.set(c.booking_product_id, []);
          }
          const looksLikeArtist =
            c.member_type === 'artist' ||
            (artistProfile && c.member_id === artistProfile.id && c.member_type === 'workspace');

          const member = looksLikeArtist ? undefined : allTeamMembers.find(m => m.id === c.member_id);

          crewByProduct.get(c.booking_product_id)!.push({
            memberId: c.member_id,
            memberType: looksLikeArtist ? 'artist' : c.member_type,
            roleLabel: c.role_label || undefined,
            name: looksLikeArtist ? (artistProfile?.name || 'Artista') : (member?.name || 'Desconocido'),
            role: looksLikeArtist ? 'Artista principal' : (member?.role || undefined),
            feeNational: c.fee_national || undefined,
            feeInternational: c.fee_international || undefined,
            isPercentage: c.is_percentage || false,
            percentageNational: c.percentage_national || undefined,
            percentageInternational: c.percentage_international || undefined,
            isTourParty: c.is_tour_party !== false, // Default to true
          });
        });
      }
      
      setFormats(existingFormats.map(f => ({
        id: f.id,
        name: f.name,
        previousName: (f as any).previous_name || undefined,
        description: f.description || undefined,
        feeNational: f.fee_national || undefined,
        feeInternational: f.fee_international || undefined,
        crewMembers: crewByProduct.get(f.id) || [],
        performanceDurationMinutes: f.performance_duration_minutes || undefined,
        riderUrl: f.rider_url || undefined,
        hospitalityRequirements: f.hospitality_requirements || undefined,
      })));
      setIsDirty(false);
    }
  }, [existingFormats, existingCrew, allTeamMembers, artistProfile]);

  // Save mutation — incremental: keeps existing IDs, only deletes what user removed
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');

      // 1. Determine which existing formats survived
      const keptIds = new Set(formats.map(f => f.id).filter(Boolean) as string[]);
      const existingIds = (existingFormats || []).map((p: any) => p.id);
      const idsToDelete = existingIds.filter(id => !keptIds.has(id));

      // 2. Delete formats removed by the user (cascade deletes their crew)
      if (idsToDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('booking_products')
          .delete()
          .in('id', idsToDelete);
        if (delErr) throw delErr;
      }

      // 3. Upsert each format (update if it has id, insert otherwise)
      const productIdByIndex: string[] = [];
      for (let idx = 0; idx < formats.length; idx++) {
        const f = formats[idx];
        const payload = {
          artist_id: artistId,
          name: f.name,
          description: f.description ?? null,
          fee_national: f.feeNational ?? null,
          fee_international: f.feeInternational ?? null,
          crew_size: f.crewMembers.length,
          performance_duration_minutes: f.performanceDurationMinutes ?? null,
          rider_url: f.riderUrl ?? null,
          hospitality_requirements: f.hospitalityRequirements ?? null,
          sort_order: idx,
        };

        let productId = f.id;
        if (productId) {
          const { error: upErr } = await supabase
            .from('booking_products')
            .update(payload)
            .eq('id', productId);
          if (upErr) throw upErr;
        } else {
          const { data: created, error: insErr } = await supabase
            .from('booking_products')
            .insert({ ...payload, created_by: user.id })
            .select('id')
            .single();
          if (insErr) throw insErr;
          productId = created!.id;
        }
        productIdByIndex[idx] = productId!;
      }

      // 4. Diff crew per format and apply minimal changes
      const existingCrewByProduct = new Map<string, any[]>();
      (existingCrew || []).forEach((c: any) => {
        if (!existingCrewByProduct.has(c.booking_product_id)) {
          existingCrewByProduct.set(c.booking_product_id, []);
        }
        existingCrewByProduct.get(c.booking_product_id)!.push(c);
      });

      for (let idx = 0; idx < formats.length; idx++) {
        const f = formats[idx];
        const productId = productIdByIndex[idx];
        const existingForProduct = existingCrewByProduct.get(productId) || [];
        const desiredKeys = new Set(
          f.crewMembers.map(cm => `${cm.memberId}::${cm.memberType === 'artist' ? 'workspace' : cm.memberType}`)
        );

        // 4a. Delete crew that no longer exists
        const toDeleteIds = existingForProduct
          .filter(c => !desiredKeys.has(`${c.member_id}::${c.member_type}`))
          .map(c => c.id);
        if (toDeleteIds.length > 0) {
          const { error: delCrewErr } = await supabase
            .from('booking_product_crew')
            .delete()
            .in('id', toDeleteIds);
          if (delCrewErr) throw delCrewErr;
        }

        // 4b. Upsert each desired crew member by (product, member_id, member_type)
        if (f.crewMembers.length > 0) {
          const rows = f.crewMembers.map((cm, cmIdx) => ({
            booking_product_id: productId,
            member_id: cm.memberId,
            member_type: cm.memberType === 'artist' ? 'workspace' : cm.memberType,
            role_label: cm.roleLabel ?? null,
            fee_national: cm.feeNational ?? null,
            fee_international: cm.feeInternational ?? null,
            is_percentage: cm.isPercentage ?? false,
            percentage_national: cm.percentageNational ?? null,
            percentage_international: cm.percentageInternational ?? null,
            is_tour_party: cm.isTourParty !== false,
            sort_order: cmIdx,
          }));
          const { error: upsertErr } = await supabase
            .from('booking_product_crew')
            .upsert(rows, { onConflict: 'booking_product_id,member_id,member_type' });
          if (upsertErr) throw upsertErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-products', artistId] });
      queryClient.invalidateQueries({ queryKey: ['booking-product-crew', artistId] });
      toast.success('Formatos guardados correctamente');
      onClose?.();
    },
    onError: (error: any) => {
      console.error('Error saving formats:', error);
      const code = error?.code ? ` [${error.code}]` : '';
      toast.error(`${error?.message || 'Error al guardar los formatos'}${code}`);
    },
  });

  const handleAddFormat = (preset?: { name: string; crewSize: number }) => {
    setFormats([
      ...formats,
      {
        name: preset?.name || 'Nuevo Formato',
        crewMembers: [],
      },
    ]);
    setIsDirty(true);
  };

  const handleRemoveFormat = (index: number) => {
    setFormats(formats.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleUpdateFormat = (index: number, updates: Partial<BookingProduct>) => {
    setFormats(formats.map((f, i) => (i === index ? { ...f, ...updates } : f)));
    setIsDirty(true);
  };

  const handleAddCrewMember = (formatIndex: number, member: CrewSelectableMember) => {
    const format = formats[formatIndex];
    if (format.crewMembers.some(cm => cm.memberId === member.id)) return;

    handleUpdateFormat(formatIndex, {
      crewMembers: [
        ...format.crewMembers,
        {
          memberId: member.id,
          memberType: member.type,
          name: member.name,
          role: member.role,
        },
      ],
    });
  };

  const handleRemoveCrewMember = (formatIndex: number, memberId: string) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.filter(cm => cm.memberId !== memberId),
    });
  };

  // Import an existing workspace contact into the format crew.
  // Always assigns to artist's team AND ensures the contact has a team category
  // so it shows up grouped correctly in "Equipo del artista".
  const handleImportContactAsCrew = async (
    formatIndex: number,
    contact: { id: string; name: string; stage_name: string | null; role: string | null; category?: string | null },
    _assignToArtist: boolean,
  ) => {
    handleAddCrewMember(formatIndex, {
      id: contact.id,
      name: contact.stage_name || contact.name,
      role: contact.role || undefined,
      type: 'contact',
    });

    if (!artistId) return;
    try {
      // Refresh session so JWT matches what RLS sees
      try { await supabase.auth.refreshSession(); } catch { /* fall back to existing session */ }

      // 1. Assign to the artist (idempotent)
      const { error: assignErr } = await supabase
        .from('contact_artist_assignments')
        .upsert(
          [{ contact_id: contact.id, artist_id: artistId }],
          { onConflict: 'contact_id,artist_id', ignoreDuplicates: true },
        );
      if (assignErr) throw assignErr;

      // 2. Ensure the contact has a team category so it groups in "Equipo del artista"
      const { data: full } = await supabase
        .from('contacts')
        .select('category, field_config')
        .eq('id', contact.id)
        .maybeSingle();
      const cfg = (full?.field_config as Record<string, any> | null) || {};
      const cats: string[] = Array.isArray(cfg.team_categories) ? cfg.team_categories : [];
      const fallbackCat = (full?.category as string | null) || 'banda';
      if (cats.length === 0) {
        await supabase
          .from('contacts')
          .update({
            category: full?.category || fallbackCat,
            field_config: { ...cfg, is_team_member: true, team_categories: [fallbackCat] },
          })
          .eq('id', contact.id);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artist-team-members-strict', artistId] }),
        queryClient.invalidateQueries({ queryKey: ['all-contacts-for-format-crew', user?.id] }),
      ]);
      toast.success(`${contact.stage_name || contact.name} añadido al equipo de ${artistName}`);
    } catch (err: any) {
      console.error('[import-contact] failed', err);
      if (err?.code === '42501') {
        toast.error('No tienes permisos para asignar este contacto al artista. Recarga la página o vuelve a iniciar sesión.');
      } else {
        toast.error(`No se pudo asignar al artista: ${err?.message || 'error desconocido'}`);
      }
    }
  };

  // Create a brand new contact and add it to the format crew in one step.
  const handleCreateNewCrewContact = async (
    formatIndex: number,
    payload: { name: string; role: string; category: string; assignToArtist: boolean },
  ) => {
    if (!user?.id) return;
    if (!payload.name.trim()) {
      toast.error('Introduce un nombre');
      return;
    }
    if (!artistId) {
      toast.error('No se ha podido identificar al artista');
      return;
    }
    setCreatingNewCrew(true);
    try {
      const { data: rpcData, error } = await supabase.rpc('create_team_contact_for_artist', {
        _name: payload.name.trim(),
        _role: payload.role.trim() || null,
        _category: payload.category,
        _artist_id: artistId,
      });
      if (error) throw error;
      const inserted = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!inserted?.id) throw new Error('No se pudo crear el contacto');

      handleAddCrewMember(formatIndex, {
        id: inserted.id,
        name: inserted.stage_name || inserted.name,
        role: inserted.role || undefined,
        type: 'contact',
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artist-team-members-strict', artistId] }),
        queryClient.invalidateQueries({ queryKey: ['all-contacts-for-format-crew', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['contact-artist-assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-product-crew', artistId] }),
      ]);

      // Reset new-form state
      setNewCrewName('');
      setNewCrewRole('');
      setNewCrewCategory('banda');
      setCrewPickerTab('team');
      toast.success(`${inserted.stage_name || inserted.name} añadido al equipo`);
    } catch (err: any) {
      console.error('[create-contact] error', err);
      const msg = String(err?.message || '');
      if (msg.includes('not_authenticated')) {
        toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.');
      } else if (msg.includes('forbidden') || err?.code === '42501') {
        toast.error('No tienes permisos en el workspace de este artista para crear contactos.');
      } else if (err?.code === '23505') {
        toast.error('Ya existe un contacto con esos datos.');
      } else {
        const code = err?.code ? ` [${err.code}]` : '';
        toast.error(`${err?.message || 'Error al crear el contacto'}${code}`);
      }
    } finally {
      setCreatingNewCrew(false);
    }
  };


  const handleUpdateCrewRole = (formatIndex: number, memberId: string, roleLabel: string) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, roleLabel } : cm
      ),
    });
  };

  const handleUpdateCrewFeeNational = (formatIndex: number, memberId: string, feeNational: number | undefined) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, feeNational } : cm
      ),
    });
  };

  const handleUpdateCrewFeeInternational = (formatIndex: number, memberId: string, feeInternational: number | undefined) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, feeInternational } : cm
      ),
    });
  };

  const handleUpdateCrewPercentageNational = (formatIndex: number, memberId: string, percentageNational: number | undefined) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, percentageNational } : cm
      ),
    });
  };

  const handleUpdateCrewPercentageInternational = (formatIndex: number, memberId: string, percentageInternational: number | undefined) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, percentageInternational } : cm
      ),
    });
  };

  const handleToggleCrewIsPercentage = (formatIndex: number, memberId: string, isPercentage: boolean) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, isPercentage } : cm
      ),
    });
  };

  const handleToggleCrewTourParty = (formatIndex: number, memberId: string, isTourParty: boolean) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, isTourParty } : cm
      ),
    });
  };

  const handleReorderCrewMembers = (formatIndex: number, activeId: string, overId: string) => {
    const format = formats[formatIndex];
    const oldIndex = format.crewMembers.findIndex(cm => cm.memberId === activeId);
    const newIndex = format.crewMembers.findIndex(cm => cm.memberId === overId);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      handleUpdateFormat(formatIndex, {
        crewMembers: arrayMove(format.crewMembers, oldIndex, newIndex),
      });
    }
  };

  // Sensors for crew member drag (no activation constraint)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sensors for format card drag (with distance to avoid interfering with clicks/expand)
  const formatSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Stable IDs for formats (used by dnd-kit)
  const formatIds = useMemo(
    () => formats.map((f, i) => f.id || `temp-${i}`),
    [formats]
  );

  const handleFormatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = formatIds.indexOf(String(active.id));
    const newIndex = formatIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    setFormats(prev => arrayMove(prev, oldIndex, newIndex));
    setIsDirty(true);
  };

  const handleRiderUpload = async (index: number, file: File) => {
    if (!user || !artistId) return;

    setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${artistId}/riders/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      handleUpdateFormat(index, { riderUrl: urlData.publicUrl });
      toast.success('Rider subido correctamente');
    } catch (error) {
      console.error('Error uploading rider:', error);
      toast.error('Error al subir el rider');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Filter out presets that are already added
  const availablePresets = PRESET_FORMATS.filter(
    preset => !formats.some(f => f.name.toLowerCase() === preset.name.toLowerCase())
  );

  return (
    <div>
      {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Add Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Añadir formato rápido</Label>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.map((preset) => (
                    <Badge
                      key={preset.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleAddFormat(preset)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Format Cards */}
            <DndContext
              sensors={formatSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFormatDragEnd}
            >
              <SortableContext items={formatIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {formats.map((format, index) => {
                const formatId = format.id || `temp-${index}`;
                const isExpanded = expandedFormats.has(formatId);
                return (
                <SortableFormatCard key={formatId} id={formatId}>
                  {(dragListeners: Record<string, any>) => (
                <Collapsible
                  open={isExpanded}
                  onOpenChange={(open) => {
                    setExpandedFormats(prev => {
                      const next = new Set(prev);
                      if (open) {
                        next.add(formatId);
                      } else {
                        next.delete(formatId);
                      }
                      return next;
                    });
                  }}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            {...dragListeners}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <span className="text-lg font-semibold">{format.name || 'Nuevo Formato'}</span>
                          {format.crewMembers.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {format.crewMembers.length} miembros
                            </Badge>
                          )}
                          {(format.feeNational || format.feeInternational) && (
                            <Badge variant="outline" className="ml-1">
                              {format.feeNational ? `NAC €${format.feeNational}` : ''}{format.feeNational && format.feeInternational ? ' / ' : ''}{format.feeInternational ? `INT €${format.feeInternational}` : ''}
                            </Badge>
                          )}
                          {format.previousName && format.previousName !== format.name && (
                            <Badge variant="outline" className="ml-1 text-[10px] text-muted-foreground font-normal">
                              Nombre anterior: {format.previousName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFormat(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-4 border-t">
                        {/* Editable Name */}
                        <div className="space-y-2">
                          <Label className="text-sm">Nombre del formato</Label>
                          <Input
                            value={format.name}
                            onChange={(e) => handleUpdateFormat(index, { name: e.target.value })}
                            placeholder="Nombre del formato"
                          />
                        </div>

                        {/* Tarifas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                              <Euro className="w-4 h-4" />
                              Tarifa Nacional
                            </Label>
                            <Input
                              type="number"
                              placeholder="€"
                              value={format.feeNational ?? ''}
                              onChange={(e) =>
                                handleUpdateFormat(index, { feeNational: parseNumInput(e.target.value) })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                              <Euro className="w-4 h-4" />
                              Tarifa Internacional
                            </Label>
                            <Input
                              type="number"
                              placeholder="€"
                              value={format.feeInternational ?? ''}
                              onChange={(e) =>
                                handleUpdateFormat(index, { feeInternational: parseNumInput(e.target.value) })
                              }
                            />
                          </div>
                        </div>

                    {/* Crew Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4" />
                        Equipo ({format.crewMembers.length} miembros)
                      </Label>
                      
                      {/* Selected Crew Members with Drag & Drop */}
                      {format.crewMembers.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event: DragEndEvent) => {
                            const { active, over } = event;
                            if (over && active.id !== over.id) {
                              handleReorderCrewMembers(index, active.id as string, over.id as string);
                            }
                          }}
                        >
                          <SortableContext
                            items={format.crewMembers.map(cm => cm.memberId)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2 mb-2">
                              {format.crewMembers.map((cm) => (
                                <SortableCrewMember
                                  key={cm.memberId}
                                  crew={cm}
                                  formatIndex={index}
                                  onUpdateFeeNational={handleUpdateCrewFeeNational}
                                  onUpdateFeeInternational={handleUpdateCrewFeeInternational}
                                  onUpdatePercentageNational={handleUpdateCrewPercentageNational}
                                  onUpdatePercentageInternational={handleUpdateCrewPercentageInternational}
                                  onToggleIsPercentage={handleToggleCrewIsPercentage}
                                  onToggleTourParty={handleToggleCrewTourParty}
                                  onRemove={handleRemoveCrewMember}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                      
                      {/* Add Crew Button */}
                      {selectingCrewForIndex === index ? (
                        <div className="border rounded-md p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Seleccionar miembros</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectingCrewForIndex(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <Tabs value={crewPickerTab} onValueChange={(v) => setCrewPickerTab(v as 'team' | 'import' | 'new')}>
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="team" className="gap-1.5 text-xs">
                                <Users className="h-3.5 w-3.5" />
                                Equipo del artista
                              </TabsTrigger>
                              <TabsTrigger value="import" className="gap-1.5 text-xs">
                                <UserPlus className="h-3.5 w-3.5" />
                                Importar contacto
                              </TabsTrigger>
                              <TabsTrigger value="new" className="gap-1.5 text-xs">
                                <Plus className="h-3.5 w-3.5" />
                                Nuevo
                              </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: only the artist's strict team */}
                            <TabsContent value="team" className="mt-3">
                              {loadingArtistTeam ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                <ScrollArea className="h-56">
                                  <div className="space-y-3">
                                    {/* Artist Profile - Highlighted at top */}
                                    {artistProfile && (
                                      <div>
                                        <p className="text-xs font-medium text-primary mb-1">
                                          Artista Principal
                                        </p>
                                        <div className="space-y-1">
                                          {(() => {
                                            const isSelected = format.crewMembers.some(
                                              cm => cm.memberId === artistProfile.id
                                            );
                                            return (
                                              <div
                                                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer bg-primary/10 border border-primary/20"
                                                onClick={() => {
                                                  if (isSelected) {
                                                    handleRemoveCrewMember(index, artistProfile.id);
                                                  } else {
                                                    handleAddCrewMember(index, {
                                                      id: artistProfile.id,
                                                      name: artistProfile.name,
                                                      role: 'Artista principal',
                                                      type: 'artist',
                                                    });
                                                  }
                                                }}
                                              >
                                                <Checkbox checked={isSelected} />
                                                <span className="text-sm font-medium">{artistProfile.name}</span>
                                                <Badge className="text-xs bg-primary/20 text-primary">
                                                  Artista
                                                </Badge>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}

                                    {groupedByCategory.length === 0 && (
                                      <div className="text-center py-6 text-xs text-muted-foreground">
                                        Este artista aún no tiene equipo asignado.
                                        <br />
                                        Usa <span className="font-medium">Importar contacto</span> o <span className="font-medium">Nuevo</span> para añadir miembros.
                                      </div>
                                    )}

                                    {/* Strict team grouped by category */}
                                    {groupedByCategory.map((category) => (
                                      <div key={category.value}>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                          {category.label}
                                        </p>
                                        <div className="space-y-1">
                                          {category.members.map((member) => {
                                            const isSelected = format.crewMembers.some(
                                              cm => cm.memberId === member.id
                                            );
                                            return (
                                              <div
                                                key={member.id}
                                                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer"
                                                onClick={() => {
                                                  if (isSelected) {
                                                    handleRemoveCrewMember(index, member.id);
                                                  } else {
                                                    handleAddCrewMember(index, member);
                                                  }
                                                }}
                                              >
                                                <Checkbox checked={isSelected} />
                                                <div className="flex flex-col flex-1">
                                                  <span className="text-sm">{member.name}</span>
                                                  {member.role && (
                                                    <span className="text-xs text-muted-foreground">{member.role}</span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              )}
                            </TabsContent>

                            {/* TAB 2: import any workspace contact */}
                            <TabsContent value="import" className="mt-3 space-y-2">
                              <Command className="rounded-lg border">
                                <CommandInput
                                  placeholder="Buscar contacto del workspace..."
                                  value={importQuery}
                                  onValueChange={setImportQuery}
                                />
                                <CommandList className="max-h-56">
                                  <CommandEmpty>Sin resultados.</CommandEmpty>
                                  <CommandGroup heading="Contactos">
                                    {allContacts
                                      .filter(c => !format.crewMembers.some(cm => cm.memberId === c.id))
                                      .map((c) => {
                                        const display = c.stage_name || c.name;
                                        return (
                                          <CommandItem
                                            key={c.id}
                                            value={`${display}-${c.id}`}
                                            onSelect={() =>
                                              handleImportContactAsCrew(index, c, true)
                                            }
                                            className="cursor-pointer"
                                          >
                                            <UserPlus className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col flex-1">
                                              <span className="text-sm">{display}</span>
                                              {c.role && (
                                                <span className="text-xs text-muted-foreground">{c.role}</span>
                                              )}
                                            </div>
                                            {c.category && (
                                              <Badge variant="secondary" className="text-[10px] capitalize">
                                                {c.category}
                                              </Badge>
                                            )}
                                          </CommandItem>
                                        );
                                      })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/15 text-primary text-[10px]">✓</span>
                                Se añadirá al equipo de {artistName}
                              </div>
                            </TabsContent>

                            {/* TAB 3: create a brand new contact */}
                            <TabsContent value="new" className="mt-3 space-y-3">
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Nombre *</Label>
                                  <Input
                                    value={newCrewName}
                                    onChange={(e) => setNewCrewName(e.target.value)}
                                    placeholder="Ej. Marta Ruiz"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Rol / Instrumento</Label>
                                    <Input
                                      value={newCrewRole}
                                      onChange={(e) => setNewCrewRole(e.target.value)}
                                      placeholder="Ej. Bajo"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Categoría</Label>
                                    <Select value={newCrewCategory} onValueChange={setNewCrewCategory}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TEAM_CATEGORIES.map((cat) => (
                                          <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/15 text-primary text-[10px]">✓</span>
                                  Se añadirá al equipo de {artistName}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full"
                                  disabled={creatingNewCrew || !newCrewName.trim()}
                                  onClick={() =>
                                    handleCreateNewCrewContact(index, {
                                      name: newCrewName,
                                      role: newCrewRole,
                                      category: newCrewCategory,
                                      assignToArtist: true,
                                    })
                                  }
                                >
                                  {creatingNewCrew ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                  )}
                                  Crear y añadir
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectingCrewForIndex(index)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Añadir miembros
                        </Button>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4" />
                        Duración (min)
                      </Label>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        placeholder="90"
                        value={format.performanceDurationMinutes || ''}
                        onChange={(e) =>
                          handleUpdateFormat(index, {
                            performanceDurationMinutes: parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>

                    {/* Rider Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm">Rider Técnico (PDF)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={uploadingIndex === index}
                          className="flex-1"
                        >
                          {uploadingIndex === index ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {format.riderUrl ? 'Cambiar Rider' : 'Subir Rider'}
                        </Button>
                        {format.riderUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={format.riderUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              Ver
                            </a>
                          </Button>
                        )}
                        <input
                          type="file"
                          ref={(el) => (fileInputRefs.current[index] = el)}
                          className="hidden"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRiderUpload(index, file);
                          }}
                        />
                      </div>
                    </div>

                    {/* Hospitality Requirements */}
                    <div className="space-y-2">
                      <Label className="text-sm">Requisitos de Hospitalidad</Label>
                      <Textarea
                        placeholder="Catering, camerino, etc."
                        value={format.hospitalityRequirements || ''}
                        onChange={(e) =>
                          handleUpdateFormat(index, { hospitalityRequirements: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
                  )}
                </SortableFormatCard>
              );
              })}

              {formats.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sin formatos configurados</h3>
                    <p className="text-muted-foreground mb-4">
                      Añade formatos de booking para este artista
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
              </SortableContext>
            </DndContext>

            {/* Add Custom Format */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddFormat()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Formato Personalizado
            </Button>

            {/* Save Button */}
            <div className="sticky bottom-0 -mx-1 px-1 pt-3 pb-1 bg-background border-t flex items-center justify-between gap-2">
              <div className="text-xs">
                {isDirty ? (
                  <span className="text-amber-600 font-medium">Tienes cambios sin guardar</span>
                ) : (
                  <span className="text-muted-foreground">Todos los cambios están guardados</span>
                )}
              </div>
              <div className="flex gap-2">
                {onClose && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
                      onClose();
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !isDirty}
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Formatos
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// Dialog wrapper for backward compatibility
export function ArtistFormatsDialog({ 
  open, 
  onOpenChange, 
  artistId, 
  artistName 
}: ArtistFormatsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Formatos de Booking - {artistName}
          </DialogTitle>
        </DialogHeader>
        <ArtistFormatsContent 
          artistId={artistId} 
          artistName={artistName} 
          onClose={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}