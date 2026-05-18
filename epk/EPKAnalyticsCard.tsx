import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  Users,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Globe,
  MousePointer,
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface EPKAnalyticsCardProps {
  epkId: string;
  epkSlug?: string;
}

interface AnalyticsData {
  totalViews: number;
  uniqueViews: number;
  totalDownloads: number;
  viewsByDay: { date: string; views: number }[];
  topReferrers: { referrer: string; count: number }[];
  recentActivity: { 
    accion: string; 
    recurso?: string; 
    created_at: string;
    referrer?: string;
  }[];
}

export function EPKAnalyticsCard({ epkId, epkSlug }: EPKAnalyticsCardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (epkId) {
      fetchAnalytics();
    }
  }, [epkId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), daysAgo);

      // Fetch analytics data
      const { data: analyticsData, error } = await supabase
        .from('epk_analytics')
        .select('*')
        .eq('epk_id', epkId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data
      const views = analyticsData?.filter(a => a.accion === 'view') || [];
      const downloads = analyticsData?.filter(a => a.accion === 'download') || [];

      // Group views by day
      const viewsByDay: { [key: string]: number } = {};
      views.forEach(v => {
        const day = format(new Date(v.created_at!), 'yyyy-MM-dd');
        viewsByDay[day] = (viewsByDay[day] || 0) + 1;
      });

      // Fill in missing days
      const viewsByDayArray: { date: string; views: number }[] = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        viewsByDayArray.push({
          date,
          views: viewsByDay[date] || 0
        });
      }

      // Get top referrers
      const referrerCounts: { [key: string]: number } = {};
      views.forEach(v => {
        const ref = v.referrer || 'Directo';
        referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
      });

      const topReferrers = Object.entries(referrerCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get unique IPs for unique views (simplified)
      const uniqueIps = new Set(views.map(v => v.ip_address));

      setAnalytics({
        totalViews: views.length,
        uniqueViews: uniqueIps.size,
        totalDownloads: downloads.length,
        viewsByDay: viewsByDayArray,
        topReferrers,
        recentActivity: (analyticsData || []).slice(0, 10).map(a => ({
          accion: a.accion || '',
          recurso: a.recurso || undefined,
          created_at: a.created_at || '',
          referrer: a.referrer || undefined
        }))
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            No hay datos de analytics disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend (compare first half vs second half of period)
  const midPoint = Math.floor(analytics.viewsByDay.length / 2);
  const firstHalfViews = analytics.viewsByDay.slice(0, midPoint).reduce((sum, d) => sum + d.views, 0);
  const secondHalfViews = analytics.viewsByDay.slice(midPoint).reduce((sum, d) => sum + d.views, 0);
  const trendPercentage = firstHalfViews > 0 
    ? Math.round(((secondHalfViews - firstHalfViews) / firstHalfViews) * 100)
    : secondHalfViews > 0 ? 100 : 0;

  const maxViews = Math.max(...analytics.viewsByDay.map(d => d.views), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics
            </CardTitle>
            <CardDescription>
              Rendimiento de tu EPK
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs px-2 h-6">7 días</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2 h-6">30 días</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs px-2 h-6">90 días</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="icon" onClick={fetchAnalytics} className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Eye className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{analytics.totalViews}</p>
            <p className="text-xs text-muted-foreground">Vistas</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{analytics.uniqueViews}</p>
            <p className="text-xs text-muted-foreground">Únicos</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Download className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{analytics.totalDownloads}</p>
            <p className="text-xs text-muted-foreground">Descargas</p>
          </div>
        </div>

        {/* Trend Badge */}
        {analytics.totalViews > 0 && (
          <div className="flex items-center justify-center">
            <Badge 
              variant="outline" 
              className={trendPercentage >= 0 
                ? "bg-green-500/10 text-green-600 border-green-500/20" 
                : "bg-red-500/10 text-red-600 border-red-500/20"
              }
            >
              {trendPercentage >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {trendPercentage >= 0 ? '+' : ''}{trendPercentage}% vs período anterior
            </Badge>
          </div>
        )}

        {/* Mini Chart */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Vistas por día
          </p>
          <div className="flex items-end gap-1 h-16">
            {analytics.viewsByDay.slice(-14).map((day, index) => (
              <div
                key={day.date}
                className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors cursor-pointer relative group"
                style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: '2px' }}
                title={`${format(new Date(day.date), 'dd MMM', { locale: es })}: ${day.views} vistas`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {day.views}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {format(new Date(analytics.viewsByDay.slice(-14)[0]?.date || new Date()), 'dd MMM', { locale: es })}
            </span>
            <span>
              {format(new Date(analytics.viewsByDay[analytics.viewsByDay.length - 1]?.date || new Date()), 'dd MMM', { locale: es })}
            </span>
          </div>
        </div>

        {/* Top Referrers */}
        {analytics.topReferrers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Globe className="w-4 h-4" />
              Fuentes de tráfico
            </p>
            <div className="space-y-1">
              {analytics.topReferrers.map((ref, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{ref.referrer}</span>
                  <Badge variant="secondary" className="text-xs">{ref.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {analytics.recentActivity.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Actividad reciente
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {activity.accion === 'view' ? (
                    <Eye className="w-3 h-3" />
                  ) : activity.accion === 'download' ? (
                    <Download className="w-3 h-3" />
                  ) : (
                    <MousePointer className="w-3 h-3" />
                  )}
                  <span className="capitalize">{activity.accion}</span>
                  {activity.recurso && (
                    <span className="truncate">- {activity.recurso}</span>
                  )}
                  <span className="ml-auto whitespace-nowrap">
                    {format(new Date(activity.created_at), 'dd/MM HH:mm', { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link */}
        {epkSlug && (
          <div className="pt-2 border-t">
            <a
              href={`/epk/${epkSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              Ver EPK público
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
