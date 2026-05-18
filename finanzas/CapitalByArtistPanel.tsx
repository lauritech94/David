import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Budget {
  id: string;
  name: string;
  type?: string;
  fee?: number;
  budget_status?: string;
  artist_id?: string;
  artists?: { name: string; stage_name?: string } | null;
  metadata?: Record<string, any>;
}

interface ArtistGroup {
  artistId: string;
  artistName: string;
  totalCapital: number;
  budgetCount: number;
  byType: Record<string, number>;
}

interface CapitalByArtistPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
}

const formatCurrency = (v: number) =>
  `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TYPE_COLORS: Record<string, string> = {
  concierto: 'bg-emerald-500',
  produccion_musical: 'bg-purple-500',
  campana_promocional: 'bg-pink-500',
  videoclip: 'bg-amber-500',
  otros: 'bg-muted-foreground',
};

const TYPE_LABELS: Record<string, string> = {
  concierto: 'Concierto',
  produccion_musical: 'Producción',
  campana_promocional: 'Campaña',
  videoclip: 'Videoclip',
  otros: 'Otros',
};

function getEstadoReal(b: Budget): string {
  const meta = b.metadata as any;
  if (meta?.estado) return meta.estado;
  if (b.budget_status && !['nacional', 'internacional'].includes(b.budget_status)) return b.budget_status;
  return 'borrador';
}

export function CapitalByArtistPanel({ open, onOpenChange, budgets }: CapitalByArtistPanelProps) {
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const artistIds = [...new Set(budgets.filter(b => b.artist_id).map(b => b.artist_id!))];
    if (!artistIds.length) return;
    supabase.from('artists').select('id, avatar_url').in('id', artistIds).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(a => { if (a.avatar_url) map[a.id] = a.avatar_url; });
      setAvatars(map);
    });
  }, [open, budgets]);

  const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
  const activeBudgets = budgets.filter(b => !closedStatuses.includes(getEstadoReal(b)));

  const groupMap = new Map<string, ArtistGroup>();
  activeBudgets.forEach(b => {
    const aid = b.artist_id || '_sin_artista';
    const aName = b.artists?.stage_name || b.artists?.name || 'Sin artista';
    if (!groupMap.has(aid)) {
      groupMap.set(aid, { artistId: aid, artistName: aName, totalCapital: 0, budgetCount: 0, byType: {} });
    }
    const g = groupMap.get(aid)!;
    g.totalCapital += b.fee || 0;
    g.budgetCount++;
    const t = b.type || 'otros';
    g.byType[t] = (g.byType[t] || 0) + (b.fee || 0);
  });

  const groups = [...groupMap.values()].sort((a, b) => b.totalCapital - a.totalCapital);
  const totalGestionado = groups.reduce((s, g) => s + g.totalCapital, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Capital Gestionado por Artista</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay presupuestos activos</p>
          ) : (
            groups.map(g => {
              const initials = g.artistName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={g.artistId} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatars[g.artistId]} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{g.artistName}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.budgetCount} presupuesto{g.budgetCount !== 1 ? 's' : ''} activo{g.budgetCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(g.totalCapital)}</span>
                  </div>
                  {g.totalCapital > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        {Object.entries(g.byType).map(([type, amount]) => (
                          <div
                            key={type}
                            className={`${TYPE_COLORS[type] || TYPE_COLORS.otros} transition-all`}
                            style={{ width: `${(amount / g.totalCapital) * 100}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(g.byType).map(([type, amount]) => (
                          <span key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className={`inline-block w-2 h-2 rounded-full ${TYPE_COLORS[type] || TYPE_COLORS.otros}`} />
                            {TYPE_LABELS[type] || type}: {formatCurrency(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total gestionado</span>
            <span className="text-lg font-bold">{formatCurrency(totalGestionado)}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
