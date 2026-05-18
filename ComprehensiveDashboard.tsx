import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Copy,
  ExternalLink,
  Activity,
  Users,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Music,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardStats {
  activeBudgets: number;
  publishedEPKs: number;
  monthlyIncome: number;
  upcomingEvents: number;
  pendingSolicitudes: number;
  totalSongs: number;
  totalContacts: number;
}

interface Budget {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total?: number;
}

interface EPK {
  id: string;
  titulo: string;
  slug: string;
  creado_en: string;
  vistas_totales?: number;
}

interface Solicitud {
  id: string;
  nombre_solicitante: string;
  tipo: string;
  estado: string;
  fecha_creacion: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location?: string;
  event_type: string;
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function DashboardCard({ title, value, description, icon, loading, trend }: DashboardCardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">{description}</p>
              {trend && (
                <div className={cn(
                  "flex items-center text-xs font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  <TrendingUp className={cn(
                    "h-3 w-3 mr-1",
                    !trend.isPositive && "rotate-180"
                  )} />
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCard
            key={i}
            title=""
            value=""
            description=""
            icon={<div />}
            loading
          />
        ))}
      </div>
      
      {/* Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ComprehensiveDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeBudgets: 0,
    publishedEPKs: 0,
    monthlyIncome: 0,
    upcomingEvents: 0,
    pendingSolicitudes: 0,
    totalSongs: 0,
    totalContacts: 0
  });
  const [recentBudgets, setRecentBudgets] = useState<Budget[]>([]);
  const [recentEPKs, setRecentEPKs] = useState<EPK[]>([]);
  const [pendingSolicitudes, setPendingSolicitudes] = useState<Solicitud[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch active budgets count
      const { count: activeBudgetsCount } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true });
      
      // Fetch published EPKs count
      const { count: publishedEPKsCount } = await supabase
        .from('epks')
        .select('*', { count: 'exact', head: true });
      
      // Fetch upcoming events count (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: upcomingEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', new Date().toISOString())
        .lte('start_date', thirtyDaysFromNow.toISOString());
      
      // Fetch recent budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select(`
          id,
          name,
          budget_status,
          created_at,
          budget_items(unit_price, quantity)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Fetch recent EPKs
      const { data: epksData } = await supabase
        .from('epks')
        .select('id, titulo, slug, creado_en, vistas_totales')
        .order('creado_en', { ascending: false })
        .limit(5);

      // Fetch pending solicitudes
      const { data: solicitudesData, count: pendingSolicitudesCount } = await supabase
        .from('solicitudes')
        .select('id, nombre_solicitante, tipo, estado, fecha_creacion', { count: 'exact' })
        .eq('estado', 'pendiente')
        .order('fecha_creacion', { ascending: false })
        .limit(5);

      // Fetch upcoming events list
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, start_date, location, event_type')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      // Fetch songs count
      const { count: songsCount } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true });

      // Fetch contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      
      // Calculate monthly income from platform_earnings
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const { data: earningsData } = await supabase
        .from('platform_earnings')
        .select('amount')
        .gte('period_end', currentMonth.toISOString())
        .lt('period_end', nextMonth.toISOString());
      
      const monthlyIncome = earningsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        activeBudgets: activeBudgetsCount || 0,
        publishedEPKs: publishedEPKsCount || 0,
        monthlyIncome,
        upcomingEvents: upcomingEventsCount || 0,
        pendingSolicitudes: pendingSolicitudesCount || 0,
        totalSongs: songsCount || 0,
        totalContacts: contactsCount || 0
      });
      
      setPendingSolicitudes(solicitudesData || []);
      setUpcomingEvents(eventsData || []);
      
      // Process budgets with totals
      const processedBudgets = (budgetsData || []).map(budget => ({
        id: budget.id,
        name: budget.name,
        status: budget.budget_status,
        created_at: budget.created_at,
        total: (budget.budget_items as any[])?.reduce((sum, item) => 
          sum + (item.unit_price * item.quantity), 0) || 0
      }));
      
      setRecentBudgets(processedBudgets);
      setRecentEPKs(epksData || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyEPKLink = async (slug: string) => {
    const url = `${PUBLIC_APP_URL}/epk/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Enlace copiado",
        description: "El enlace del EPK se ha copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, type: 'budget') => {
    switch (status) {
      case 'borrador':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'en_revision':
        return <Badge variant="outline">En revisión</Badge>;
      case 'aprobado':
        return <Badge className="bg-emerald-100 text-emerald-800">Aprobado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button 
          onClick={() => navigate('/budgets')}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
        <Button 
          onClick={() => navigate('/epk-builder')}
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo EPK
        </Button>
        <Button 
          onClick={() => navigate('/booking')}
          variant="outline"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Ir a Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <DashboardCard
          title="Presupuestos"
          value={stats.activeBudgets}
          description="Activos"
          icon={<FileText className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="EPKs"
          value={stats.publishedEPKs}
          description="Publicados"
          icon={<Globe className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="Ingresos"
          value={`€${stats.monthlyIncome.toLocaleString()}`}
          description="Este mes"
          icon={<DollarSign className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="Eventos"
          value={stats.upcomingEvents}
          description="Próximos 30 días"
          icon={<Calendar className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="Solicitudes"
          value={stats.pendingSolicitudes}
          description="Pendientes"
          icon={<Clock className="h-6 w-6 text-amber-500" />}
        />
        <DashboardCard
          title="Canciones"
          value={stats.totalSongs}
          description="Registradas"
          icon={<Music className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="Contactos"
          value={stats.totalContacts}
          description="En rolodex"
          icon={<Users className="h-6 w-6 text-primary" />}
        />
      </div>

      {/* Upcoming Events Widget */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximos Eventos
              </CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/calendar')}
            >
              Ver calendario
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex-shrink-0 w-48 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium text-sm truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.start_date), "d MMM, HH:mm", { locale: es })}
                  </p>
                  {event.location && (
                    <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                  )}
                  <Badge variant="outline" className="mt-2 text-xs">
                    {event.event_type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Solicitudes Widget */}
      {pendingSolicitudes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Solicitudes Pendientes</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/solicitudes')}
            >
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSolicitudes.slice(0, 3).map((sol) => (
                <div
                  key={sol.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate('/solicitudes')}
                >
                  <div>
                    <p className="font-medium text-sm">{sol.nombre_solicitante}</p>
                    <p className="text-xs text-muted-foreground">
                      {sol.tipo} • {format(new Date(sol.fecha_creacion), "d MMM", { locale: es })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    Pendiente
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimos 5 Presupuestos</CardTitle>
              <CardDescription>Presupuestos creados recientemente</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/budgets')}
              className="text-primary hover:text-primary/80"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBudgets.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">No hay presupuestos aún</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/budgets')}
                    className="text-primary mt-2"
                  >
                    Crear tu primer presupuesto
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBudgets.map((budget) => (
                  <div 
                    key={budget.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/budgets/${budget.id}`)}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{budget.name}</p>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(budget.status, 'budget')}
                        <span className="text-xs text-muted-foreground">
                          {new Date(budget.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        €{budget.total?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent EPKs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>EPKs Recientes</CardTitle>
              <CardDescription>Últimos EPKs actualizados</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/epks')}
              className="text-primary hover:text-primary/80"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentEPKs.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">No hay EPKs creados aún</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/epk-builder')}
                    className="text-primary mt-2"
                  >
                    Crear tu primer EPK
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEPKs.map((epk) => (
                  <div 
                    key={epk.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium">{epk.titulo}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">EPK</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(epk.creado_en).toLocaleDateString()}
                        </span>
                        {epk.vistas_totales && (
                          <span className="text-xs text-muted-foreground">
                            {epk.vistas_totales} vistas
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyEPKLink(epk.slug);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/epk/${epk.slug}`, '_blank');
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}