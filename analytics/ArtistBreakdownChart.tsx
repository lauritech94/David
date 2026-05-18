import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';
import type { ArtistRevenue } from '@/hooks/useAnalyticsData';
import { formatCurrency, ARTIST_PALETTE } from './analyticsUtils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  data: ArtistRevenue[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ArtistRevenue;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium">{d.artistName}</p>
      <p className="text-muted-foreground">{formatCurrency(d.revenue)} · {d.percentage.toFixed(1)}%</p>
    </div>
  );
};

export function ArtistBreakdownChart({ data, isLoading }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Ingresos por Artista
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No hay datos de artistas
        </CardContent>
      </Card>
    );
  }

  const displayed = showAll ? data : data.slice(0, 5);
  const chartHeight = Math.max(displayed.length * 48, 120);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Ingresos por Artista
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayed} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="artistName"
                width={100}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {displayed.map((entry, i) => (
                  <Cell key={entry.artistId} fill={entry.brandColor || ARTIST_PALETTE[i % ARTIST_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {data.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Ver menos' : `Ver todos (${data.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
