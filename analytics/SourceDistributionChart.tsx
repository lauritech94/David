import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { formatCurrency } from './analyticsUtils';
import type { SourceFilter } from '@/hooks/useAnalyticsFilters';

interface SourceData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: SourceData[];
  isLoading?: boolean;
  onSourceClick?: (source: SourceFilter) => void;
}

const SOURCE_MAP: Record<string, SourceFilter> = {
  'Conciertos': 'booking',
  'Sincronizaciones': 'sync',
  'Royalties': 'royalties',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SourceData;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
    </div>
  );
};

export function SourceDistributionChart({ data, isLoading, onSourceClick }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieIcon className="h-5 w-5 text-primary" />
            Distribución por Fuente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No hay datos disponibles
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieIcon className="h-5 w-5 text-primary" />
          Distribución por Fuente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 h-56">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  cursor="pointer"
                  onClick={(entry) => {
                    const source = SOURCE_MAP[entry.name];
                    if (source) onSourceClick?.(source);
                  }}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 min-w-[140px]">
            {data.map(d => (
              <div
                key={d.name}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  const source = SOURCE_MAP[d.name];
                  if (source) onSourceClick?.(source);
                }}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(d.value)} · {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
