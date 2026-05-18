import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { TimeSeriesPoint } from '@/hooks/useAnalyticsData';
import { formatCurrency } from './analyticsUtils';
import { useState } from 'react';

interface Props {
  data: TimeSeriesPoint[];
  isLoading?: boolean;
  onGranularityChange?: (g: 'month' | 'quarter' | 'year') => void;
  granularity: 'month' | 'quarter' | 'year';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueTimeChart({ data, isLoading, onGranularityChange, granularity }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-80 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Ingresos en el tiempo
        </CardTitle>
        <div className="flex gap-1">
          {(['month', 'quarter', 'year'] as const).map(g => (
            <Button
              key={g}
              variant={granularity === g ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => onGranularityChange?.(g)}
            >
              {{ month: 'Mes', quarter: 'Trim', year: 'Año' }[g]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="booking" name="Conciertos" fill="hsl(142, 70%, 45%)" stackId="revenue" radius={[0, 0, 0, 0]} />
              <Bar dataKey="sync" name="Sync" fill="hsl(260, 85%, 65%)" stackId="revenue" radius={[0, 0, 0, 0]} />
              <Bar dataKey="royalties" name="Royalties" fill="hsl(213, 94%, 60%)" stackId="revenue" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="total" name="Total" stroke="hsl(0, 0%, 45%)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
