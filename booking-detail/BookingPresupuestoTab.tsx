import { useState, useEffect, useRef, useMemo } from 'react';
import { isPaidStatus } from '@/lib/billingStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList, Plus, ExternalLink, DollarSign,
  CreditCard, AlertTriangle, CheckCircle2, Link as LinkIcon,
  Copy, Pencil, Trash2, Star, MoreHorizontal, ChevronDown,
  ChevronRight, Unlink, FilePlus2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  duplicateBudget, renameBudget, budgetNameSchema,
  setPrimaryBudget, unlinkBudgetFromBooking,
} from '@/lib/budgets/bookingBudgetActions';
import { DeleteBudgetDialog } from '@/components/booking-detail/DeleteBudgetDialog';
import { cn } from '@/lib/utils';

interface BookingPresupuestoTabProps {
  bookingId: string;
  artistId?: string | null;
  projectId?: string | null;
  eventName?: string;
  eventDate?: string | null;
  eventCity?: string | null;
  eventVenue?: string | null;
  fee?: number | null;
  formato?: string | null;
}

interface BudgetSummary {
  id: string;
  name: string;
  fee: number | null;
  expense_budget: number | null;
  budget_status: string | null;
  booking_offer_id: string | null;
  project_id: string | null;
  is_primary_for_booking?: boolean | null;
  items: {
    unit_price: number | null;
    quantity: number | null;
    iva_percentage: number | null;
    irpf_percentage: number | null;
    billing_status: string | null;
    is_provisional: boolean | null;
    category: string;
  }[];
}

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export function BookingPresupuestoTab({
  bookingId, artistId, projectId, eventName, eventDate,
  eventCity, eventVenue, fee, formato
}: BookingPresupuestoTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBudgetForDialog, setSelectedBudgetForDialog] = useState<any>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedAlt, setExpandedAlt] = useState<Record<string, boolean>>({});
  const [showAlternatives, setShowAlternatives] = useState(true);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingNameId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingNameId]);

  const { data, isLoading } = useQuery({
    queryKey: ['booking-budgets', bookingId, projectId],
    queryFn: async () => {
      const SELECT = 'id, name, type, fee, expense_budget, budget_status, booking_offer_id, project_id, city, country, venue, show_status, internal_notes, created_at, artist_id, event_date, event_time, formato, is_primary_for_booking';

      const { data: directBudgets } = await supabase
        .from('budgets').select(SELECT).eq('booking_offer_id', bookingId);

      let projectBudgets: typeof directBudgets = [];
      if (projectId) {
        const { data: pBudgets } = await supabase
          .from('budgets').select(SELECT)
          .eq('project_id', projectId).eq('type', 'concierto');
        projectBudgets = pBudgets || [];
      }

      let fuzzyBudgets: typeof directBudgets = [];
      if (artistId) {
        const orConditions = [
          eventName ? `name.ilike.%${eventName}%` : null,
          eventDate ? `event_date.eq.${eventDate}` : null,
        ].filter(Boolean).join(',');
        if (orConditions) {
          const { data: fBudgets } = await supabase
            .from('budgets').select(SELECT)
            .eq('artist_id', artistId).or(orConditions);
          fuzzyBudgets = fBudgets || [];
        }
      }

      const allIds = new Set<string>();
      const combined: typeof directBudgets = [];
      for (const b of [...(directBudgets || []), ...(projectBudgets || []), ...(fuzzyBudgets || [])]) {
        if (!allIds.has(b.id)) { allIds.add(b.id); combined.push(b); }
      }

      // Auto-sync booking → linked budgets
      if (combined.length > 0) {
        const syncFields: Record<string, any> = {};
        if (eventDate) syncFields.event_date = eventDate;
        if (eventCity) syncFields.city = eventCity;
        if (eventVenue) syncFields.venue = eventVenue;
        if (fee != null) syncFields.fee = fee;

        if (Object.keys(syncFields).length > 0) {
          const outOfSync = combined.filter(
            b => b.booking_offer_id === bookingId && (
              (eventDate && b.event_date !== eventDate) ||
              (eventCity && b.city !== eventCity) ||
              (eventVenue && b.venue !== eventVenue) ||
              (fee != null && b.fee !== fee)
            )
          );
          if (outOfSync.length > 0) {
            await supabase.from('budgets').update(syncFields)
              .in('id', outOfSync.map(b => b.id));
            outOfSync.forEach(b => Object.assign(b, syncFields));
          }
        }
      }

      if (combined.length === 0) return { linked: [] as BudgetSummary[], unlinked: [] as BudgetSummary[] };

      const { data: allItems } = await supabase
        .from('budget_items')
        .select('budget_id, unit_price, quantity, iva_percentage, irpf_percentage, billing_status, is_provisional, category, category_id, budget_categories(name)')
        .in('budget_id', combined.map(b => b.id));

      const itemsByBudget = (allItems || []).reduce((acc, item) => {
        const key = (item as any).budget_id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, typeof allItems>);

      const budgets: BudgetSummary[] = combined.map(b => ({
        ...b,
        items: (itemsByBudget[b.id] || []) as BudgetSummary['items'],
      }));

      const linked = budgets.filter(b => b.booking_offer_id === bookingId);
      const unlinked = budgets.filter(b => b.booking_offer_id !== bookingId);
      return { linked, unlinked };
    },
    enabled: !!bookingId && !!user,
  });

  const calcKPIs = (budget: BudgetSummary) => {
    const capital = budget.fee || 0;
    const items = budget.items || [];
    let comprometido = 0, pagado = 0, confirmado = 0, provisional = 0;
    items.forEach(item => {
      const base = (item.unit_price || 0) * (item.quantity || 1);
      comprometido += base;
      if (isPaidStatus(item.billing_status)) pagado += base;
      if (item.is_provisional) provisional += base;
      else confirmado += base;
    });
    return { capital, comprometido, pagado, confirmado, provisional, disponible: capital - comprometido };
  };

  const linked = data?.linked || [];
  const unlinked = data?.unlinked || [];

  // Determine principal: explicit flag wins, fallback to first linked
  const { principal, alternatives } = useMemo(() => {
    if (linked.length === 0) return { principal: null as BudgetSummary | null, alternatives: [] as BudgetSummary[] };
    const flagged = linked.find(b => b.is_primary_for_booking);
    const principal = flagged || linked[0];
    const alternatives = linked.filter(b => b.id !== principal.id);
    return { principal, alternatives };
  }, [linked]);

  // Auto-promote first linked budget to primary if none is flagged yet
  useEffect(() => {
    if (linked.length > 0 && !linked.some(b => b.is_primary_for_booking)) {
      const first = linked[0];
      supabase.from('budgets')
        .update({ is_primary_for_booking: true })
        .eq('id', first.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] }));
    }
  }, [linked, bookingId, projectId, queryClient]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] });

  const createBudget = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      setIsCreating(true);
      const isFirst = linked.length === 0;
      const budgetName = isFirst
        ? `Presupuesto - ${eventName || 'Evento'}`
        : `Alternativa ${alternatives.length + 1} - ${eventName || 'Evento'}`;

      const { data: newBudget, error } = await supabase
        .from('budgets')
        .insert({
          name: budgetName,
          type: 'concierto' as any,
          artist_id: artistId,
          project_id: projectId,
          booking_offer_id: bookingId,
          event_date: eventDate,
          city: eventCity,
          venue: eventVenue,
          fee: fee,
          formato: formato,
          created_by: user.id,
          is_primary_for_booking: isFirst,
        })
        .select().single();
      if (error) throw error;

      if (formato && artistId) {
        try {
          const { loadCrewFromFormat } = await import('@/utils/budgetCrewLoader');
          await loadCrewFromFormat({
            budgetId: newBudget.id, formatName: formato, artistId,
            bookingFee: fee || 0, isInternational: false, userId: user.id,
          });
        } catch (e) { console.warn('Could not auto-populate crew:', e); }
      }
      return newBudget;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Presupuesto creado' }); setIsCreating(false); },
    onError: (error) => {
      setIsCreating(false);
      toast({ title: 'Error al crear presupuesto', description: error.message, variant: 'destructive' });
    },
  });

  const linkBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const isFirst = linked.length === 0;
      const { error } = await supabase
        .from('budgets')
        .update({ booking_offer_id: bookingId, ...(isFirst ? { is_primary_for_booking: true } : {}) })
        .eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Presupuesto vinculado' }); },
  });

  const renameMutation = useMutation({
    mutationFn: ({ budgetId, name }: { budgetId: string; name: string }) =>
      renameBudget(budgetId, name),
    onSuccess: () => { invalidate(); setEditingNameId(null); toast({ title: 'Nombre actualizado' }); },
    onError: (err: any) => toast({ title: 'No se pudo renombrar', description: err?.message, variant: 'destructive' }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (sourceBudgetId: string) => {
      if (!user) throw new Error('No autenticado');
      return duplicateBudget(sourceBudgetId, user.id);
    },
    onSuccess: (newBudget) => {
      invalidate();
      toast({ title: 'Presupuesto duplicado como alternativo' });
      setSelectedBudgetForDialog(newBudget);
    },
    onError: (err: any) => toast({ title: 'No se pudo duplicar', description: err?.message, variant: 'destructive' }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (newPrimaryId: string) => setPrimaryBudget(bookingId, newPrimaryId),
    onSuccess: () => { invalidate(); toast({ title: 'Marcado como principal' }); },
    onError: (err: any) => toast({ title: 'No se pudo marcar', description: err?.message, variant: 'destructive' }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (budgetId: string) => unlinkBudgetFromBooking(budgetId),
    onSuccess: () => { invalidate(); toast({ title: 'Presupuesto desvinculado' }); },
    onError: (err: any) => toast({ title: 'No se pudo desvincular', description: err?.message, variant: 'destructive' }),
  });

  const startEditingName = (budget: { id: string; name: string }) => {
    setEditingNameId(budget.id);
    setNameDraft(budget.name);
  };

  const commitNameEdit = (budgetId: string, originalName: string) => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === originalName) { setEditingNameId(null); return; }
    const parsed = budgetNameSchema.safeParse(trimmed);
    if (!parsed.success) {
      toast({ title: 'Nombre inválido', description: parsed.error.issues[0]?.message, variant: 'destructive' });
      return;
    }
    renameMutation.mutate({ budgetId, name: parsed.data });
  };

  // ── Render helpers ──────────────────────────────────────────────────
  const renderAddMenu = (variant: 'default' | 'lg' = 'default') => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={variant === 'lg' ? 'default' : 'sm'} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Añadir presupuesto
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Crear o vincular</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => createBudget.mutate()}
          disabled={createBudget.isPending}
        >
          <FilePlus2 className="h-4 w-4 mr-2" />
          Crear nuevo en blanco
        </DropdownMenuItem>
        {principal && (
          <DropdownMenuItem
            onClick={() => duplicateMutation.mutate(principal.id)}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar el principal
          </DropdownMenuItem>
        )}
        {unlinked.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LinkIcon className="h-4 w-4 mr-2" />
              Vincular del proyecto
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-72 max-h-72 overflow-auto">
              {unlinked.map(b => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => linkBudget.mutate(b.id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium text-sm truncate w-full">{b.name}</span>
                  {b.fee != null && b.fee > 0 && (
                    <span className="text-xs text-muted-foreground">{fmt(b.fee)}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderActionsMenu = (budget: BudgetSummary, isPrincipal: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setSelectedBudgetForDialog(budget)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir presupuesto
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startEditingName(budget)}>
          <Pencil className="h-4 w-4 mr-2" />
          Renombrar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => duplicateMutation.mutate(budget.id)}
          disabled={duplicateMutation.isPending}
        >
          <Copy className="h-4 w-4 mr-2" />
          Duplicar como alternativo
        </DropdownMenuItem>
        {!isPrincipal && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setPrimaryMutation.mutate(budget.id)}
              disabled={setPrimaryMutation.isPending}
            >
              <Star className="h-4 w-4 mr-2" />
              Marcar como principal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => unlinkMutation.mutate(budget.id)}
              disabled={unlinkMutation.isPending}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Desvincular del booking
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setBudgetToDelete({ id: budget.id, name: budget.name })}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderEditableName = (budget: BudgetSummary, sizeClass = 'text-base') => (
    editingNameId === budget.id ? (
      <Input
        ref={nameInputRef}
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => commitNameEdit(budget.id, budget.name)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitNameEdit(budget.id, budget.name); }
          else if (e.key === 'Escape') { e.preventDefault(); setEditingNameId(null); }
        }}
        maxLength={120}
        disabled={renameMutation.isPending}
        className={cn('h-8 font-semibold', sizeClass)}
      />
    ) : (
      <button
        type="button"
        onClick={() => startEditingName(budget)}
        title="Editar nombre"
        className="group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 hover:bg-muted text-left truncate"
      >
        <span className={cn('truncate font-semibold', sizeClass)}>{budget.name}</span>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    )
  );

  // ── Loading ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────
  if (linked.length === 0 && unlinked.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
            title="Sin presupuesto de producción"
            description="Crea un presupuesto para gestionar los gastos de este concierto"
            action={{
              label: '+ Crear presupuesto',
              onClick: () => createBudget.mutate(),
            }}
          />
          {isCreating && <p className="text-center text-sm text-muted-foreground mt-4">Creando presupuesto...</p>}
        </CardContent>
      </Card>
    );
  }

  // Empty linked but has unlinked candidates
  if (linked.length === 0 && unlinked.length > 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
              title="Aún no hay presupuesto vinculado a este booking"
              description="Crea uno desde cero o vincula uno existente del proyecto."
            />
            <div className="flex justify-center mt-4">{renderAddMenu('lg')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Presupuestos del evento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {linked.length} vinculado{linked.length !== 1 ? 's' : ''} · 1 principal
            {alternatives.length > 0 && ` · ${alternatives.length} alternativ${alternatives.length === 1 ? 'o' : 'os'}`}
          </p>
        </div>
        {renderAddMenu()}
      </div>

      {/* PRINCIPAL */}
      {principal && (() => {
        const kpi = calcKPIs(principal);
        const categoryCounts: Record<string, { total: number; count: number }> = {};
        principal.items.forEach(item => {
          const cat = (item as any).budget_categories?.name || item.category || 'Sin categoría';
          if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, count: 0 };
          categoryCounts[cat].total += (item.unit_price || 0) * (item.quantity || 1);
          categoryCounts[cat].count += 1;
        });

        return (
          <Card className="border-primary/40 ring-1 ring-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-primary/30 gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Principal
                  </Badge>
                  {principal.budget_status && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {principal.budget_status}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg flex items-center gap-2 min-w-0">
                  {renderEditableName(principal, 'text-lg')}
                </CardTitle>
              </div>
              {renderActionsMenu(principal, true)}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Capital
                  </p>
                  <p className="text-lg font-bold">{fmt(kpi.capital)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Pagado
                  </p>
                  <p className="text-lg font-bold text-green-600">{fmt(kpi.pagado)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Comprometido
                  </p>
                  <p className="text-lg font-bold text-amber-600">{fmt(kpi.comprometido)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmt(kpi.confirmado)} confirmado · {fmt(kpi.provisional)} provisional
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Disponible
                  </p>
                  <p className={cn('text-lg font-bold', kpi.disponible >= 0 ? 'text-green-600' : 'text-destructive')}>
                    {fmt(kpi.disponible)}
                  </p>
                </div>
              </div>

              {Object.keys(categoryCounts).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Desglose por categoría</h4>
                  <div className="space-y-1.5">
                    {Object.entries(categoryCounts)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([cat, { total, count }]) => (
                        <div key={cat} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                          <span>{cat} <span className="text-muted-foreground text-xs">({count})</span></span>
                          <span className="font-medium">{fmt(total)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* ALTERNATIVAS */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAlternatives(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showAlternatives ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>Alternativos</span>
            <Badge variant="secondary" className="text-[10px] h-4">{alternatives.length}</Badge>
          </button>

          {showAlternatives && (
            <div className="space-y-2">
              {alternatives.map(alt => {
                const kpi = calcKPIs(alt);
                const isOpen = !!expandedAlt[alt.id];
                return (
                  <Card key={alt.id} className="border-dashed hover:border-solid transition-colors">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedAlt(s => ({ ...s, [alt.id]: !s[alt.id] }))}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">{alt.name}</span>
                            {alt.budget_status && (
                              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{alt.budget_status}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Capital {fmt(kpi.capital)} · Comprometido {fmt(kpi.comprometido)} ·{' '}
                            <span className={kpi.disponible >= 0 ? 'text-green-600' : 'text-destructive'}>
                              Disponible {fmt(kpi.disponible)}
                            </span>
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setPrimaryMutation.mutate(alt.id)}
                          disabled={setPrimaryMutation.isPending}
                          className="text-xs h-8"
                          title="Marcar como principal"
                        >
                          <Star className="h-3.5 w-3.5 mr-1" />
                          Principal
                        </Button>
                        {renderActionsMenu(alt, false)}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t px-3 py-3 bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="rounded border bg-background p-2">
                            <p className="text-[10px] text-muted-foreground">Capital</p>
                            <p className="text-sm font-semibold">{fmt(kpi.capital)}</p>
                          </div>
                          <div className="rounded border bg-background p-2">
                            <p className="text-[10px] text-muted-foreground">Pagado</p>
                            <p className="text-sm font-semibold text-green-600">{fmt(kpi.pagado)}</p>
                          </div>
                          <div className="rounded border bg-background p-2">
                            <p className="text-[10px] text-muted-foreground">Comprometido</p>
                            <p className="text-sm font-semibold text-amber-600">{fmt(kpi.comprometido)}</p>
                          </div>
                          <div className="rounded border bg-background p-2">
                            <p className="text-[10px] text-muted-foreground">Disponible</p>
                            <p className={cn('text-sm font-semibold', kpi.disponible >= 0 ? 'text-green-600' : 'text-destructive')}>
                              {fmt(kpi.disponible)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline" size="sm" className="w-full"
                          onClick={() => setSelectedBudgetForDialog(alt)}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Abrir presupuesto completo
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Disponibles para vincular */}
      {unlinked.length > 0 && (
        <Card className="bg-muted/20 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2 font-medium">
              <LinkIcon className="h-3.5 w-3.5" />
              Disponibles para vincular del proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {unlinked.map(budget => (
              <div
                key={budget.id}
                className="flex items-center justify-between border rounded-lg p-2.5 bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{budget.name}</p>
                  {budget.fee != null && budget.fee > 0 && (
                    <p className="text-xs text-muted-foreground">{fmt(budget.fee)}</p>
                  )}
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => linkBudget.mutate(budget.id)}
                  disabled={linkBudget.isPending}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Vincular
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedBudgetForDialog && (
        <BudgetDetailsDialog
          open={!!selectedBudgetForDialog}
          onOpenChange={(open) => { if (!open) setSelectedBudgetForDialog(null); }}
          budget={selectedBudgetForDialog}
          onUpdate={invalidate}
        />
      )}
      <DeleteBudgetDialog
        budgetId={budgetToDelete?.id ?? null}
        budgetName={budgetToDelete?.name ?? ''}
        open={!!budgetToDelete}
        onOpenChange={(open) => { if (!open) setBudgetToDelete(null); }}
        onDeleted={() => { invalidate(); setBudgetToDelete(null); }}
      />
    </div>
  );
}
