import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter } from 'lucide-react';
import type { PipelineStage } from '@/hooks/useAnalyticsData';
import { formatCurrency, formatNumber, FUNNEL_COLORS } from './analyticsUtils';

interface Props {
  data: PipelineStage[];
  isLoading?: boolean;
}

export function BookingPipelineFunnel({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5 text-primary" />
          Pipeline de Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {data.map((stage, i) => (
          <div key={stage.phase}>
            <div className="flex items-center gap-3">
              <div className="w-24 text-right">
                <span className="text-xs font-medium">{stage.label}</span>
              </div>
              <div className="flex-1 relative">
                <div
                  className="h-10 rounded-md flex items-center px-3 gap-2 transition-all"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, 12)}%`,
                    backgroundColor: FUNNEL_COLORS[i] || FUNNEL_COLORS[4],
                  }}
                >
                  <span className="text-xs font-bold text-white whitespace-nowrap">
                    {stage.count}
                  </span>
                  <span className="text-xs text-white/80 whitespace-nowrap hidden sm:inline">
                    {formatCurrency(stage.value)}
                  </span>
                </div>
              </div>
            </div>
            {stage.conversionFromPrevious !== null && i > 0 && (
              <div className="ml-24 pl-3 py-0.5">
                <span className="text-[10px] text-muted-foreground">
                  ↓ {stage.conversionFromPrevious.toFixed(0)}% conversión
                </span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
