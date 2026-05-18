import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, AlertCircle, Music, BarChart3 } from 'lucide-react';
import type { KPIData } from '@/hooks/useAnalyticsData';
import { formatCurrency, formatNumber, formatPercent, calcVariation } from './analyticsUtils';
import { cn } from '@/lib/utils';

interface Props {
  current: KPIData;
  previous: KPIData;
  isLoading?: boolean;
}

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  variation: number | null;
  icon: React.ReactNode;
  alert?: boolean;
}

function KPICard({ label, value, subtitle, variation, icon, alert }: KPICardProps) {
  return (
    <Card className={cn("transition-all hover:shadow-md", alert && "border-destructive/40")}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted shrink-0">{icon}</div>
        </div>
        {variation !== null && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs font-medium",
            variation >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPercent(variation)} vs anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KPICards({ current, previous, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const netMargin = current.grossRevenue > 0
    ? (current.netRevenue / current.grossRevenue) * 100
    : 0;

  const avgEventsPerMonth = current.totalEvents > 0
    ? (current.totalEvents / 12).toFixed(1)
    : '0';

  const cards: KPICardProps[] = [
    {
      label: 'Ingresos Brutos',
      value: formatCurrency(current.grossRevenue),
      variation: calcVariation(current.grossRevenue, previous.grossRevenue),
      icon: <DollarSign className="h-4 w-4 text-primary" />,
    },
    {
      label: 'Ingresos Netos',
      value: formatCurrency(current.netRevenue),
      subtitle: `Margen: ${netMargin.toFixed(1)}%`,
      variation: calcVariation(current.netRevenue, previous.netRevenue),
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
    },
    {
      label: 'Ingresos por Conciertos',
      value: formatCurrency(current.bookingRevenue),
      subtitle: `${current.bookingCount} conciertos`,
      variation: calcVariation(current.bookingRevenue, previous.bookingRevenue),
      icon: <Music className="h-4 w-4 text-primary" />,
    },
    {
      label: 'Sync + Royalties',
      value: formatCurrency(current.syncRoyaltiesRevenue),
      variation: calcVariation(current.syncRoyaltiesRevenue, previous.syncRoyaltiesRevenue),
      icon: <BarChart3 className="h-4 w-4 text-secondary" />,
    },
    {
      label: 'Eventos Realizados',
      value: formatNumber(current.totalEvents),
      subtitle: `~${avgEventsPerMonth}/mes`,
      variation: calcVariation(current.totalEvents, previous.totalEvents),
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
    },
    {
      label: 'Fee Medio',
      value: formatCurrency(current.avgFee),
      variation: calcVariation(current.avgFee, previous.avgFee),
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
    },
    {
      label: 'Tasa de Conversión',
      value: `${current.conversionRate.toFixed(1)}%`,
      variation: calcVariation(current.conversionRate, previous.conversionRate),
      icon: <Target className="h-4 w-4 text-amber-500" />,
    },
    {
      label: 'Cobros Pendientes',
      value: formatCurrency(current.pendingPayments),
      subtitle: `${current.pendingPaymentCount} eventos`,
      variation: null,
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      alert: current.hasOverdue,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <KPICard key={i} {...card} />
      ))}
    </div>
  );
}
