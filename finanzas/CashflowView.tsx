import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarDays, CalendarClock, HelpCircle } from 'lucide-react';
import { ContactLinker } from './ContactLinker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetRef {
  id: string;
  name: string;
  event_date?: string;
  artist_id?: string;
  budget_status?: string;
  metadata?: Record<string, any>;
  artists?: { name: string; stage_name?: string } | null;
}

interface CashflowItem {
  id: string;
  name: string;
  budgetId: string;
  budgetName: string;
  artistId: string;
  artistName: string;
  category: string;
  contactName: string | null;
  isProvisional: boolean;
  baseAmount: number;
  ivaAmount: number;
  irpfAmount: number;
  transferAmount: number;
  dueDate: string | null;
}

interface CashflowViewProps {
  artistId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  `€${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function getEstadoReal(b: BudgetRef): string {
  const meta = b.metadata as any;
  if (meta?.estado) return meta.estado;
  if (b.budget_status && !['nacional', 'internacional'].includes(b.budget_status)) return b.budget_status;
  return 'borrador';
}

type TimeGroup = 'vencido' | 'esta_semana' | 'proximas_semanas' | 'este_mes' | 'mas_adelante' | 'sin_fecha';

function getTimeGroup(date: string | null): TimeGroup {
  if (!date) return 'sin_fecha';
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'vencido';
  if (diff <= 7) return 'esta_semana';
  if (diff <= 14) return 'proximas_semanas';
  if (diff <= 30) return 'este_mes';
  return 'mas_adelante';
}

const GROUP_CONFIG: { key: TimeGroup; label: string; icon: string; className: string }[] = [
  { key: 'vencido', label: '🔴 Vencidos', icon: '🔴', className: 'text-destructive' },
  { key: 'esta_semana', label: '📅 Esta semana', icon: '📅', className: 'text-foreground' },
  { key: 'proximas_semanas', label: '📅 Próximas 2 semanas', icon: '📅', className: 'text-foreground' },
  { key: 'este_mes', label: '📅 Este mes', icon: '📅', className: 'text-foreground' },
  { key: 'mas_adelante', label: '📅 Más adelante', icon: '📅', className: 'text-muted-foreground' },
  { key: 'sin_fecha', label: '○ Sin fecha', icon: '○', className: 'text-muted-foreground' },
];

type QuickFilter = 'todos' | 'vencidos' | 'esta_semana' | 'provisionales' | 'sin_contacto';

// ─── Component ────────────────────────────────────────────────────────────────

export function CashflowView({ artistId }: CashflowViewProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CashflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('todos');

  useEffect(() => {
    fetchData();
  }, [artistId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch budgets
    let bq = supabase
      .from('budgets')
      .select('id, name, event_date, artist_id, budget_status, metadata, artists:artist_id(name, stage_name)');
    if (artistId !== 'all') bq = bq.eq('artist_id', artistId);
    const { data: budgets } = await bq;

    const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
    const activeBudgets = (budgets || []).filter(b => !closedStatuses.includes(getEstadoReal(b as BudgetRef)));
    const activeIds = activeBudgets.map(b => b.id);

    if (!activeIds.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch unpaid items with contact info (excluye todos los estados pagados)
    const { data: itemsData } = await supabase
      .from('budget_items')
      .select('id, name, unit_price, quantity, category, is_provisional, billing_status, iva_percentage, irpf_percentage, budget_id, contact_id, contacts:contact_id(name)')
      .in('budget_id', activeIds)
      .not('billing_status', 'in', '(pagado,pagada,pagado_sin_factura)');

    const budgetMap = new Map(activeBudgets.map(b => [b.id, b]));

    const cashflowItems: CashflowItem[] = (itemsData || [])
      .map(item => {
        const budget = budgetMap.get(item.budget_id);
        const base = (item.unit_price ?? 0) * (item.quantity || 1);
        const iva = base * ((item.iva_percentage ?? 0) / 100);
        const irpf = base * ((item.irpf_percentage ?? 0) / 100);
          return {
          id: item.id,
          name: item.name,
          budgetId: item.budget_id,
          budgetName: budget?.name || '',
          artistId: budget?.artist_id || '',
          artistName: (budget?.artists as any)?.stage_name || (budget?.artists as any)?.name || '',
          category: item.category || '',
          contactName: (item.contacts as any)?.name || null,
          isProvisional: item.is_provisional || false,
          baseAmount: base,
          ivaAmount: iva,
          irpfAmount: irpf,
          transferAmount: base + iva - irpf,
          dueDate: budget?.event_date || null,
        };
      })
      .filter(item => item.transferAmount !== 0);

    // Sort: provisional last, then by date
    cashflowItems.sort((a, b) => {
      if (a.isProvisional !== b.isProvisional) return a.isProvisional ? 1 : -1;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });

    setItems(cashflowItems);
    setLoading(false);
  };

  // Summary calculations — separate committed (confirmed) vs estimated (provisional)
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const committed = items.filter(i => !i.isProvisional);
  const provisionales = items.filter(i => i.isProvisional);

  const thisWeekTotal = committed.filter(i => i.dueDate && new Date(i.dueDate) >= now && new Date(i.dueDate) <= in7Days).reduce((s, i) => s + i.transferAmount, 0);
  const thisMonthTotal = committed.filter(i => i.dueDate && new Date(i.dueDate) >= now && new Date(i.dueDate) <= in30Days).reduce((s, i) => s + i.transferAmount, 0);
  const noDateTotal = committed.filter(i => !i.dueDate).reduce((s, i) => s + i.transferAmount, 0);
  const noDateCount = committed.filter(i => !i.dueDate).length;
  const overdueCount = committed.filter(i => getTimeGroup(i.dueDate) === 'vencido').length;
  const provisionalTotal = provisionales.reduce((s, i) => s + i.transferAmount, 0);
  const provisionalCount = provisionales.length;

  // Apply quick filter
  const filtered = items.filter(item => {
    switch (quickFilter) {
      case 'vencidos': return getTimeGroup(item.dueDate) === 'vencido';
      case 'esta_semana': return getTimeGroup(item.dueDate) === 'esta_semana';
      case 'provisionales': return item.isProvisional;
      case 'sin_contacto': return !item.contactName;
      default: return true;
    }
  });

  // Group items
  const grouped = new Map<TimeGroup, CashflowItem[]>();
  GROUP_CONFIG.forEach(g => grouped.set(g.key, []));
  filtered.forEach(item => {
    const group = getTimeGroup(item.dueDate);
    grouped.get(group)!.push(item);
  });

  const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'vencidos', label: `Vencidos${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
    { value: 'esta_semana', label: 'Esta semana' },
    { value: 'provisionales', label: 'Provisionales' },
    { value: 'sin_contacto', label: 'Sin contacto' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-moodita border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A pagar esta semana</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(thisWeekTotal)}</div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A pagar este mes</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(thisMonthTotal)}</div>
          </CardContent>
        </Card>

        <Card className={`card-moodita border-l-4 ${noDateCount > 0 ? 'border-l-amber-500' : 'border-l-muted-foreground/30'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin fecha asignada</CardTitle>
            <HelpCircle className={`h-4 w-4 ${noDateCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(noDateTotal)}</div>
            {noDateCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{noDateCount} ítems necesitan fecha</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick filters */}
      <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setQuickFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              quickFilter === f.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && quickFilter === 'todos' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">⚠ {overdueCount} pago{overdueCount !== 1 ? 's' : ''} vencido{overdueCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Cashflow list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No hay pagos pendientes</p>
        </div>
      ) : (
        GROUP_CONFIG.map(({ key, label, className }) => {
          const groupItems = grouped.get(key) || [];
          if (groupItems.length === 0) return null;
          const groupTotal = groupItems.reduce((s, i) => s + i.transferAmount, 0);

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${className}`}>
                  {label}
                </h3>
                <span className={`text-xs font-medium ${className}`}>{fmt(groupTotal)}</span>
              </div>
              <div className="space-y-2">
                {groupItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      item.isProvisional
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Left: concept info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <button
                            className="text-xs text-primary hover:underline truncate"
                            onClick={() => navigate(`/budgets/${item.budgetId}`)}
                          >
                            {item.budgetName}
                          </button>
                          {item.artistName && (
                            <span className="text-xs text-muted-foreground">{item.artistName}</span>
                          )}
                          {item.contactName ? (
                            <span className="text-xs text-muted-foreground/70">→ {item.contactName}</span>
                          ) : (
                            <ContactLinker
                              itemId={item.id}
                              artistId={item.artistId}
                              artistName={item.artistName}
                              onLinked={(contactId, contactName) => {
                                setItems(prev =>
                                  prev.map(i =>
                                    i.id === item.id ? { ...i, contactName } : i
                                  )
                                );
                              }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{item.category}</Badge>
                          <Badge
                            variant={item.isProvisional ? 'warning' : 'muted'}
                            className="text-[10px] py-0 px-1.5"
                          >
                            {item.isProvisional ? 'Provisional' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>

                      {/* Right: amounts */}
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <div className="text-xs text-muted-foreground tabular-nums">
                          Base: {fmt(item.baseAmount)}
                          {item.ivaAmount > 0 && <span> + IVA {fmt(item.ivaAmount)}</span>}
                        </div>
                        {item.irpfAmount > 0 && (
                          <div className="text-xs text-muted-foreground/70 tabular-nums">
                            IRPF: -{fmt(item.irpfAmount)}
                          </div>
                        )}
                        <div className="text-sm font-bold tabular-nums text-foreground">
                          A transferir: {fmt(item.transferAmount)}
                        </div>
                        {item.dueDate && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(item.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
