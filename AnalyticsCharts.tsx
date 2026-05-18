import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAnalytics, useRecentActivity } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign, Music } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PLATFORM_COLORS: Record<string, string> = {
  spotify: '#1DB954',
  apple_music: '#FC3C44',
  youtube: '#FF0000',
  amazon: '#FF9900',
  tidal: '#00FFFF',
  deezer: '#FEAA2D',
  other: '#6B7280',
};

export function MonthlyTrendChart() {
  const { data, isLoading } = useAnalytics(6);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.monthlyTrend || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tendencia Mensual
        </CardTitle>
        <CardDescription>Eventos y actividad de los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="events" fill="hsl(var(--primary))" name="Eventos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" fill="hsl(var(--primary) / 0.5)" name="Bookings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function EarningsTrendChart() {
  const { data, isLoading } = useAnalytics(6);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.monthlyTrend || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Ingresos por Royalties
        </CardTitle>
        <CardDescription>Evolución de ganancias mensuales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ingresos']}
              />
              <Line 
                type="monotone" 
                dataKey="earnings" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformBreakdownChart() {
  const { data, isLoading } = useAnalytics(6);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.platformBreakdown || [];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Ingresos por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No hay datos de plataformas
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Ingresos por Plataforma
        </CardTitle>
        <CardDescription>Distribución de ganancias por streaming</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center">
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.other} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `€${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2">
            {chartData.map((platform) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PLATFORM_COLORS[platform.platform] || PLATFORM_COLORS.other }}
                  />
                  <span className="text-sm capitalize">{platform.platform.replace('_', ' ')}</span>
                </div>
                <span className="text-sm font-medium">€{platform.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentActivityFeed() {
  const { data: activities, isLoading } = useRecentActivity(8);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'solicitud': return <Activity className="h-4 w-4 text-amber-500" />;
      case 'epk': return <Music className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pendiente: 'secondary',
      aprobada: 'default',
      denegada: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Actividad Reciente
        </CardTitle>
        <CardDescription>Últimas actualizaciones del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities?.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getActivityIcon(activity.type)}
                <div>
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(activity.status)}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(activity.date), 'd MMM', { locale: es })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsSummaryCards() {
  const { data, isLoading } = useAnalytics(6);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Ingresos',
      value: `€${data?.totalEarnings.toFixed(2) || '0.00'}`,
      icon: <DollarSign className="h-5 w-5 text-green-500" />,
      trend: data?.monthlyTrend?.[5]?.earnings > (data?.monthlyTrend?.[4]?.earnings || 0),
    },
    {
      label: 'Eventos Totales',
      value: data?.totalEvents || 0,
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
    },
    {
      label: 'Solicitudes Pendientes',
      value: data?.pendingSolicitudes || 0,
      icon: <Activity className="h-5 w-5 text-amber-500" />,
    },
    {
      label: 'Solicitudes Aprobadas',
      value: data?.approvedSolicitudes || 0,
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              {stat.icon}
            </div>
            {stat.trend !== undefined && (
              <div className={`flex items-center mt-2 text-xs ${stat.trend ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {stat.trend ? 'Subiendo' : 'Bajando'}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
