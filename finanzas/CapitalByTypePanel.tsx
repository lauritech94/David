import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Music, Video, Megaphone, Disc3, FolderOpen } from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  type?: string;
  fee?: number;
  budget_status?: string;
  metadata?: Record<string, any>;
}

interface CapitalByTypePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
  artistName: string;
}

const formatCurrency = (v: number) =>
  `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  concierto: { label: 'Conciertos', color: 'bg-emerald-500', icon: Music },
  produccion_musical: { label: 'Producción Musical', color: 'bg-purple-500', icon: Disc3 },
  campana_promocional: { label: 'Campaña Promocional', color: 'bg-pink-500', icon: Megaphone },
  videoclip: { label: 'Videoclip', color: 'bg-amber-500', icon: Video },
  otros: { label: 'Otros', color: 'bg-muted-foreground', icon: FolderOpen },
};

function getEstadoReal(b: Budget): string {
  const meta = b.metadata as any;
  if (meta?.estado) return meta.estado;
  if (b.budget_status && !['nacional', 'internacional'].includes(b.budget_status)) return b.budget_status;
  return 'borrador';
}

export function CapitalByTypePanel({ open, onOpenChange, budgets, artistName }: CapitalByTypePanelProps) {
  const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
  const activeBudgets = budgets.filter(b => !closedStatuses.includes(getEstadoReal(b)));

  const byType = new Map<string, { total: number; count: number }>();
  activeBudgets.forEach(b => {
    const t = b.type || 'otros';
    const entry = byType.get(t) || { total: 0, count: 0 };
    entry.total += b.fee || 0;
    entry.count++;
    byType.set(t, entry);
  });

  const groups = [...byType.entries()]
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.total - a.total);

  const totalCapital = groups.reduce((s, g) => s + g.total, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Capital — {artistName}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay presupuestos activos</p>
          ) : (
            <>
              {/* Overall bar */}
              {totalCapital > 0 && (
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {groups.map(g => {
                    const cfg = TYPE_CONFIG[g.type] || TYPE_CONFIG.otros;
                    return (
                      <div
                        key={g.type}
                        className={`${cfg.color} transition-all`}
                        style={{ width: `${(g.total / totalCapital) * 100}%` }}
                      />
                    );
                  })}
                </div>
              )}

              {groups.map(g => {
                const cfg = TYPE_CONFIG[g.type] || TYPE_CONFIG.otros;
                const Icon = cfg.icon;
                const pct = totalCapital > 0 ? (g.total / totalCapital) * 100 : 0;
                return (
                  <div key={g.type} className="p-4 rounded-lg border border-border bg-card space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${cfg.color}/10`}>
                        <Icon className={`h-4 w-4 text-foreground`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.count} presupuesto{g.count !== 1 ? 's' : ''} · {pct.toFixed(0)}%
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(g.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${cfg.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total capital</span>
            <span className="text-lg font-bold">{formatCurrency(totalCapital)}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
