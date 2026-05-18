import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Wallet, AlertTriangle, CheckCircle, TrendingDown, ShieldCheck } from 'lucide-react';

interface BudgetAggregates {
  activeCount: number;
  inProductionCount: number;
  pendingCount: number;
  totalCapital: number;
  totalConfirmed: number;
  totalProvisional: number;
  totalDisponible: number;
  exceededCount: number;
}

interface BudgetSummaryCardsProps {
  budgets: Array<{
    id: string;
    budget_status?: string;
    fee?: number;
  }>;
  onCardClick?: (type: 'activos' | 'capital' | 'comprometido' | 'disponible' | 'excedidos') => void;
  activeCard?: string | null;
}

const formatCurrency = (value: number) =>
  `€${Math.abs(value).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function BudgetSummaryCards({ budgets, onCardClick, activeCard }: BudgetSummaryCardsProps) {
  const [aggregates, setAggregates] = useState<BudgetAggregates>({
    activeCount: 0,
    inProductionCount: 0,
    pendingCount: 0,
    totalCapital: 0,
    totalConfirmed: 0,
    totalProvisional: 0,
    totalDisponible: 0,
    exceededCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!budgets.length) {
      setAggregates({
        activeCount: 0, inProductionCount: 0, pendingCount: 0,
        totalCapital: 0, totalConfirmed: 0, totalProvisional: 0,
        totalDisponible: 0, exceededCount: 0,
      });
      setLoading(false);
      return;
    }

    const calculateAggregates = async () => {
      setLoading(true);
      const closedStatuses = ['cerrado', 'archivado', 'rechazado'];
      const activeBudgets = budgets.filter(b => !closedStatuses.includes(b.budget_status || ''));
      const activeIds = activeBudgets.map(b => b.id);

      if (!activeIds.length) {
        setAggregates({
          activeCount: 0, inProductionCount: 0, pendingCount: 0,
          totalCapital: 0, totalConfirmed: 0, totalProvisional: 0,
          totalDisponible: 0, exceededCount: 0,
        });
        setLoading(false);
        return;
      }

      // Fetch all budget_items for active budgets
      const { data: items } = await supabase
        .from('budget_items')
        .select('budget_id, unit_price, quantity, is_provisional, billing_status')
        .in('budget_id', activeIds);

      // Calculate per-budget metrics
      const perBudget = new Map<string, { confirmed: number; provisional: number }>();
      activeIds.forEach(id => perBudget.set(id, { confirmed: 0, provisional: 0 }));

      (items || []).forEach(item => {
        const amount = (item.unit_price ?? 0) * (item.quantity || 1);
        const entry = perBudget.get(item.budget_id);
        if (!entry) return;
        if (item.billing_status === 'pagado') return; // paid items don't count as committed
        if (item.is_provisional) {
          entry.provisional += amount;
        } else {
          entry.confirmed += amount;
        }
      });

      let totalConfirmed = 0;
      let totalProvisional = 0;
      let totalDisponible = 0;
      let exceededCount = 0;

      activeBudgets.forEach(b => {
        const capital = b.fee || 0;
        const entry = perBudget.get(b.id)!;
        const committed = entry.confirmed + entry.provisional;
        // Also need paid for disponible calculation
        const budgetItems = (items || []).filter(i => i.budget_id === b.id);
        const paid = budgetItems
          .filter(i => i.billing_status === 'pagado')
          .reduce((sum, i) => sum + (i.unit_price ?? 0) * (i.quantity || 1), 0);
        const disponible = capital - paid - entry.confirmed - entry.provisional;

        totalConfirmed += entry.confirmed;
        totalProvisional += entry.provisional;
        totalDisponible += disponible;
        if (disponible < 0) exceededCount++;
      });

      const totalCapital = activeBudgets.reduce((sum, b) => sum + (b.fee || 0), 0);
      const inProductionCount = activeBudgets.filter(b =>
        ['aprobado', 'en_produccion', 'en producción'].includes(b.budget_status || '')
      ).length;
      const pendingCount = activeBudgets.filter(b =>
        ['borrador', 'enviado', 'pendiente'].includes(b.budget_status || '')
      ).length;

      setAggregates({
        activeCount: activeBudgets.length,
        inProductionCount,
        pendingCount,
        totalCapital,
        totalConfirmed,
        totalProvisional,
        totalDisponible,
        exceededCount,
      });
      setLoading(false);
    };

    calculateAggregates();
  }, [budgets]);

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="bg-[hsl(var(--card))] border-border/50">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-7 w-16 bg-muted rounded" />
                <div className="h-2 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { activeCount, inProductionCount, pendingCount, totalCapital, totalConfirmed, totalProvisional, totalDisponible, exceededCount } = aggregates;
  const isExceeded = totalDisponible < 0;
  const hasExceededBudgets = exceededCount > 0;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {/* 1. PRESUPUESTOS ACTIVOS */}
      <Card className={`card-moodita cursor-pointer transition-all hover:shadow-md ${activeCard === 'activos' ? 'ring-2 ring-primary border-primary/50' : ''}`} onClick={() => onCardClick?.('activos')}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Presupuestos Activos
            </span>
          </div>
          <div className="text-3xl font-bold text-foreground">{activeCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {inProductionCount > 0 && <span>{inProductionCount} en producción</span>}
            {inProductionCount > 0 && pendingCount > 0 && <span> · </span>}
            {pendingCount > 0 && <span>{pendingCount} pendientes</span>}
            {inProductionCount === 0 && pendingCount === 0 && <span>{activeCount} activos</span>}
          </div>
        </CardContent>
      </Card>

      {/* 2. CAPITAL GESTIONADO */}
      <Card className="card-moodita cursor-pointer transition-all hover:shadow-md" onClick={() => onCardClick?.('capital')}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Capital Gestionado
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalCapital)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Capital total comprometido</div>
        </CardContent>
      </Card>

      {/* 3. COMPROMETIDO */}
      <Card className="card-moodita cursor-pointer transition-all hover:shadow-md" onClick={() => onCardClick?.('comprometido')}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Comprometido
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalConfirmed + totalProvisional)}
          </div>
          <div className="text-[11px] mt-1 flex items-center gap-1 flex-wrap">
            <span className="text-muted-foreground">{formatCurrency(totalConfirmed)} confirmado</span>
            {totalProvisional > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-amber-500">{formatCurrency(totalProvisional)} provisional</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. DISPONIBLE AGREGADO */}
      <Card className={`card-moodita cursor-pointer transition-all hover:shadow-md ${activeCard === 'disponible' ? 'ring-2 ring-primary border-primary/50' : ''}`} onClick={() => onCardClick?.('disponible')}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            {isExceeded ? (
              <TrendingDown className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Disponible Agregado
            </span>
          </div>
          <div className={`text-2xl font-bold ${isExceeded ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isExceeded ? '-' : ''}{formatCurrency(totalDisponible)}
          </div>
          <div className={`text-[11px] mt-1 ${isExceeded ? 'text-destructive/70' : 'text-muted-foreground'}`}>
            {isExceeded ? 'Excedido' : 'Margen disponible'}
          </div>
        </CardContent>
      </Card>

      {/* 5. EXCEDIDOS */}
      <Card className={`card-moodita cursor-pointer transition-all hover:shadow-md ${hasExceededBudgets ? 'border-destructive/40 animate-pulse-subtle' : ''} ${activeCard === 'excedidos' ? 'ring-2 ring-destructive border-destructive/50' : ''}`} onClick={() => onCardClick?.('excedidos')}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            {hasExceededBudgets ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Excedidos
            </span>
          </div>
          <div className={`text-3xl font-bold ${hasExceededBudgets ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {hasExceededBudgets ? exceededCount : '✓'}
          </div>
          <div className={`text-[11px] mt-1 ${hasExceededBudgets ? 'text-destructive/70' : 'text-muted-foreground'}`}>
            {hasExceededBudgets ? 'presupuestos en rojo' : 'Todo en orden'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
