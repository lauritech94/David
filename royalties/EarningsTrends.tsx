import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlatformEarnings, useSongs } from '@/hooks/useRoyalties';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EarningsTrendsProps {
  artistId?: string;
}

export function EarningsTrends({ artistId }: EarningsTrendsProps) {
  const { data: songs = [] } = useSongs(artistId);
  const { data: allEarnings = [] } = usePlatformEarnings();

  // Filter earnings by artist
  const songIds = new Set(songs.map(s => s.id));
  const earnings = artistId && artistId !== 'all'
    ? allEarnings.filter(e => songIds.has(e.song_id))
    : allEarnings;

  // Monthly earnings trend
  const monthlyData = useMemo(() => {
    const months: Record<string, { amount: number; streams: number }> = {};
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      months[key] = { amount: 0, streams: 0 };
    }

    earnings.forEach(e => {
      const key = format(parseISO(e.period_end), 'yyyy-MM');
      if (months[key]) {
        months[key].amount += Number(e.amount);
        months[key].streams += e.streams || 0;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month: format(parseISO(month + '-01'), 'MMM yy', { locale: es }),
      ...data,
    }));
  }, [earnings]);

  // Platform comparison
  const platformData = useMemo(() => {
    const platforms: Record<string, number> = {};
    
    earnings.forEach(e => {
      platforms[e.platform] = (platforms[e.platform] || 0) + Number(e.amount);
    });

    return Object.entries(platforms)
      .map(([platform, amount]) => ({ platform, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [earnings]);

  // Calculate trend
  const trend = useMemo(() => {
    if (monthlyData.length < 2) return { direction: 'neutral', percentage: 0 };
    
    const current = monthlyData[monthlyData.length - 1].amount;
    const previous = monthlyData[monthlyData.length - 2].amount;
    
    if (previous === 0) return { direction: 'up', percentage: 100 };
    
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change),
    };
  }, [monthlyData]);

  const totalThisMonth = monthlyData[monthlyData.length - 1]?.amount || 0;
  const totalLastMonth = monthlyData[monthlyData.length - 2]?.amount || 0;

  if (earnings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No hay datos suficientes para mostrar tendencias</p>
          <p className="text-sm mt-2">Registra ganancias para ver el análisis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este mes</p>
                <p className="text-2xl font-bold">€{totalThisMonth.toFixed(2)}</p>
              </div>
              <div className={`flex items-center gap-1 ${
                trend.direction === 'up' ? 'text-green-500' : 
                trend.direction === 'down' ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {trend.direction === 'up' && <TrendingUp className="h-5 w-5" />}
                {trend.direction === 'down' && <TrendingDown className="h-5 w-5" />}
                {trend.direction === 'neutral' && <Minus className="h-5 w-5" />}
                <span className="text-sm font-medium">{trend.percentage.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mes anterior</p>
            <p className="text-2xl font-bold">€{totalLastMonth.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Promedio mensual</p>
            <p className="text-2xl font-bold">
              €{(monthlyData.reduce((sum, d) => sum + d.amount, 0) / 12).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolución de Ganancias (12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ganancias']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Platform Comparison */}
      {platformData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ganancias por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="platform" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Total']}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streams Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reproducciones Mensuales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Streams']}
                />
                <Line
                  type="monotone"
                  dataKey="streams"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
