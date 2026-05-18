import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Budget {
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
  budgetName: string;
  artistName: string;
  category: string;
  isProvisional: boolean;
  baseAmount: number;
  transferAmount: number;
  dueDate: string | null;
}

interface CashflowPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
}

const formatCurrency = (v: number) =>
  `€${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function getEstadoReal(b: Budget): string {
  const meta = b.metadata as any;
  if (meta?.estado) return meta.estado;
  if (b.budget_status && !['nacional', 'internacional'].includes(b.budget_status)) return b.budget_status;
  return 'borrador';
}

function getWeekGroup(date: string | null): string {
  if (!date) return 'sin_fecha';
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'vencido';
  if (diff <= 7) return 'esta_semana';
  if (diff <= 21) return 'proximas_semanas';
  return 'mas_adelante';
}

const GROUP_LABELS: Record<string, string> = {
  vencido: '⚠ Vencidos',
  esta_semana: 'Esta semana',
  proximas_semanas: 'Próximas 2-3 semanas',
  mas_adelante: 'Más adelante',
  sin_fecha: 'Sin fecha',
};

const GROUP_ORDER = ['vencido', 'esta_semana', 'proximas_semanas', 'mas_adelante', 'sin_fecha'];

export function CashflowPanel({ open, onOpenChange, budgets }: CashflowPanelProps) {
  const [items, setItems] = useState<CashflowItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchItems();
  }, [open, budgets]);

  const fetchItems = async () => {
    setLoading(true);
    const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
    const activeBudgets = budgets.filter(b => !closedStatuses.includes(getEstadoReal(b)));
    const activeIds = activeBudgets.map(b => b.id);

    if (!activeIds.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('budget_items')
      .select('id, name, unit_price, quantity, category, is_provisional, billing_status, iva_percentage, irpf_percentage, budget_id')
      .in('budget_id', activeIds)
      .not('billing_status', 'in', '(pagado,pagada,pagado_sin_factura)');

    const budgetMap = new Map(activeBudgets.map(b => [b.id, b]));

    const cashflowItems: CashflowItem[] = (data || []).map(item => {
      const budget = budgetMap.get(item.budget_id);
      const base = (item.unit_price ?? 0) * (item.quantity || 1);
      const iva = base * ((item.iva_percentage ?? 0) / 100);
      const irpf = base * ((item.irpf_percentage ?? 0) / 100);
      return {
        id: item.id,
        name: item.name,
        budgetName: budget?.name || '',
        artistName: budget?.artists?.stage_name || budget?.artists?.name || '',
        category: item.category || '',
        isProvisional: item.is_provisional || false,
        baseAmount: base,
        transferAmount: base + iva - irpf,
        dueDate: budget?.event_date || null,
      };
    }).filter(item => item.transferAmount !== 0);

    cashflowItems.sort((a, b) => {
      if (a.isProvisional !== b.isProvisional) return a.isProvisional ? 1 : -1;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });

    setItems(cashflowItems);
    setLoading(false);
  };

  const totalPendiente = items.reduce((s, i) => s + i.transferAmount, 0);
  const totalConfirmado = items.filter(i => !i.isProvisional).reduce((s, i) => s + i.transferAmount, 0);
  const totalProvisional = items.filter(i => i.isProvisional).reduce((s, i) => s + i.transferAmount, 0);
  const overdueCount = items.filter(i => getWeekGroup(i.dueDate) === 'vencido').length;

  const grouped = new Map<string, CashflowItem[]>();
  GROUP_ORDER.forEach(g => grouped.set(g, []));
  items.forEach(item => {
    const group = getWeekGroup(item.dueDate);
    grouped.get(group)!.push(item);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pagos Pendientes — Cashflow</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Header summary */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total pendiente de pago</span>
              <span className="text-xl font-bold">{formatCurrency(totalPendiente)}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-muted-foreground">
                Confirmado: <span className="font-medium text-foreground">{formatCurrency(totalConfirmado)}</span>
              </span>
              {totalProvisional > 0 && (
                <span className="text-amber-500">
                  Provisional: <span className="font-medium">{formatCurrency(totalProvisional)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Overdue alert */}
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">⚠ {overdueCount} pago{overdueCount !== 1 ? 's' : ''} vencido{overdueCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay pagos pendientes</p>
          ) : (
            GROUP_ORDER.map(groupKey => {
              const groupItems = grouped.get(groupKey) || [];
              if (groupItems.length === 0) return null;
              return (
                <div key={groupKey} className="space-y-2">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${groupKey === 'vencido' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {GROUP_LABELS[groupKey]}
                  </h3>
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.budgetName}</p>
                            {item.artistName && (
                              <p className="text-xs text-muted-foreground/70 truncate">{item.artistName}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold tabular-nums">{formatCurrency(item.transferAmount)}</p>
                            {item.dueDate && (
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                {new Date(item.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{item.category}</Badge>
                          <Badge
                            variant={item.isProvisional ? 'warning' : 'muted'}
                            className="text-[10px] py-0 px-1.5"
                          >
                            {item.isProvisional ? 'Provisional' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
