import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, 
  Calendar, Mic, Music, HelpCircle, Info, FileText, BarChart3
} from 'lucide-react';
import { differenceInCalendarDays, differenceInHours, subDays, subMonths, startOfWeek, startOfMonth, startOfDay, format, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro';
  nombre_solicitante: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  archived?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_limite_respuesta?: string;
  decision_fecha?: string | null;
}

interface SolicitudesStatsProps {
  solicitudes: Solicitud[];
}

const typeConfig: Record<string, { label: string; icon: typeof Mic; color: string }> = {
  entrevista: { label: 'Entrevista', icon: Mic, color: '#22c55e' },
  booking: { label: 'Booking', icon: Music, color: '#3b82f6' },
  consulta: { label: 'Consulta', icon: HelpCircle, color: '#a855f7' },
  informacion: { label: 'Información', icon: Info, color: '#f97316' },
  licencia: { label: 'Licencia', icon: FileText, color: '#14b8a6' },
  otro: { label: 'Otro', icon: FileText, color: '#6b7280' },
};

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#14b8a6', '#6b7280'];

type TimelineRange = '30d' | '3m' | '6m' | '1y';

const RANGE_LABELS: Record<TimelineRange, string> = {
  '30d': 'Últimos 30 días',
  '3m': 'Últimos 3 meses',
  '6m': 'Últimos 6 meses',
  '1y': 'Último año',
};

export function SolicitudesStats({ solicitudes }: SolicitudesStatsProps) {
  const [range, setRange] = useState<TimelineRange>('30d');

  const stats = useMemo(() => {
    const active = solicitudes.filter(s => !s.archived);
    const pendientes = active.filter(s => s.estado === 'pendiente');
    const aprobadas = active.filter(s => s.estado === 'aprobada');
    const denegadas = active.filter(s => s.estado === 'denegada');
    const archivadas = solicitudes.filter(s => s.archived);

    // Calculate overdue and urgent
    const now = new Date();
    const overdue = pendientes.filter(s => {
      if (!s.fecha_limite_respuesta) return false;
      return differenceInCalendarDays(new Date(s.fecha_limite_respuesta), now) < 0;
    });

    const urgent = pendientes.filter(s => {
      if (!s.fecha_limite_respuesta) return false;
      const days = differenceInCalendarDays(new Date(s.fecha_limite_respuesta), now);
      return days >= 0 && days <= 2;
    });

    // Average response time (only for resolved solicitudes)
    const resolved = active.filter(s => s.estado !== 'pendiente' && s.decision_fecha);
    const avgResponseTime = resolved.length > 0
      ? resolved.reduce((acc, s) => {
          const hours = differenceInHours(new Date(s.decision_fecha!), new Date(s.fecha_creacion));
          return acc + hours;
        }, 0) / resolved.length
      : 0;

    // Approval rate
    const totalResolved = aprobadas.length + denegadas.length;
    const approvalRate = totalResolved > 0 ? (aprobadas.length / totalResolved) * 100 : 0;

    // Type distribution
    const typeDistribution = Object.keys(typeConfig).map(tipo => ({
      name: typeConfig[tipo as keyof typeof typeConfig].label,
      value: active.filter(s => s.tipo === tipo).length,
      color: typeConfig[tipo as keyof typeof typeConfig].color,
    })).filter(t => t.value > 0);

    // Status distribution for bar chart
    const statusDistribution = [
      { name: 'Pendientes', value: pendientes.length, fill: 'hsl(var(--warning))' },
      { name: 'Aprobadas', value: aprobadas.length, fill: 'hsl(var(--success))' },
      { name: 'Denegadas', value: denegadas.length, fill: 'hsl(var(--destructive))' },
    ];

    return {
      total: active.length,
      pendientes: pendientes.length,
      aprobadas: aprobadas.length,
      denegadas: denegadas.length,
      archivadas: archivadas.length,
      overdue: overdue.length,
      urgent: urgent.length,
      avgResponseTime,
      approvalRate,
      typeDistribution,
      statusDistribution,
    };
  }, [solicitudes]);

  // Timeline computed independently to react to range changes
  const timelineData = useMemo(() => {
    const now = new Date();
    type Bucket = 'day' | 'week' | 'month';
    const config: Record<TimelineRange, { count: number; bucket: Bucket; labelFmt: string }> = {
      '30d': { count: 30, bucket: 'day', labelFmt: 'dd MMM' },
      '3m': { count: 13, bucket: 'week', labelFmt: 'dd MMM' },
      '6m': { count: 26, bucket: 'week', labelFmt: 'dd MMM' },
      '1y': { count: 12, bucket: 'month', labelFmt: "MMM ''yy" },
    };
    const { count, bucket, labelFmt } = config[range];

    const startOfBucket = (d: Date): Date => {
      if (bucket === 'day') return startOfDay(d);
      if (bucket === 'week') return startOfWeek(d, { weekStartsOn: 1 });
      return startOfMonth(d);
    };

    const points: { key: string; date: Date }[] = [];
    for (let i = count - 1; i >= 0; i--) {
      let d: Date;
      if (bucket === 'day') d = subDays(now, i);
      else if (bucket === 'week') d = subDays(now, i * 7);
      else d = subMonths(now, i);
      const start = startOfBucket(d);
      points.push({ key: start.toISOString(), date: start });
    }

    const buckets = new Map<string, { creadas: number; resueltas: number }>();
    points.forEach(p => buckets.set(p.key, { creadas: 0, resueltas: 0 }));

    const earliest = points[0].date;
    solicitudes.forEach(s => {
      if (s.fecha_creacion) {
        const d = new Date(s.fecha_creacion);
        if (d >= earliest) {
          const key = startOfBucket(d).toISOString();
          const b = buckets.get(key);
          if (b) b.creadas += 1;
        }
      }
      if (s.decision_fecha) {
        const d = new Date(s.decision_fecha);
        if (d >= earliest) {
          const key = startOfBucket(d).toISOString();
          const b = buckets.get(key);
          if (b) b.resueltas += 1;
        }
      }
    });

    return points.map(p => {
      const b = buckets.get(p.key)!;
      return {
        date: format(p.date, labelFmt, { locale: es }),
        creadas: b.creadas,
        resueltas: b.resueltas,
      };
    });
  }, [solicitudes, range]);


  const formatResponseTime = (hours: number) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="card-moodita">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-warning/30 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-warning">{stats.pendientes}</p>
              </div>
              <Clock className="w-8 h-8 text-warning opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-success/30 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
                <p className="text-2xl font-bold text-success">{stats.aprobadas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Denegadas</p>
                <p className="text-2xl font-bold text-destructive">{stats.denegadas}</p>
              </div>
              <XCircle className="w-8 h-8 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className={`card-moodita ${stats.overdue > 0 ? 'border-destructive bg-destructive/10' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-destructive' : ''}`}>
                  {stats.overdue}
                </p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${stats.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'} opacity-60`} />
            </div>
          </CardContent>
        </Card>

        <Card className={`card-moodita ${stats.urgent > 0 ? 'border-warning bg-warning/10' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgentes</p>
                <p className={`text-2xl font-bold ${stats.urgent > 0 ? 'text-warning' : ''}`}>
                  {stats.urgent}
                </p>
              </div>
              <Calendar className={`w-8 h-8 ${stats.urgent > 0 ? 'text-warning' : 'text-muted-foreground'} opacity-60`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approval Rate */}
        <Card className="card-moodita">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tasa de Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold">{Math.round(stats.approvalRate)}%</span>
              <span className="text-sm text-muted-foreground mb-1">aprobadas</span>
            </div>
            <Progress value={stats.approvalRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.aprobadas} de {stats.aprobadas + stats.denegadas} resueltas
            </p>
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card className="card-moodita">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Tiempo Promedio de Respuesta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{formatResponseTime(stats.avgResponseTime)}</span>
              <span className="text-sm text-muted-foreground mb-1">promedio</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Basado en {stats.aprobadas + stats.denegadas} solicitudes resueltas
            </p>
          </CardContent>
        </Card>

        {/* Type Distribution Pie */}
        <Card className="card-moodita">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {stats.typeDistribution.map((type, index) => (
                <Badge 
                  key={type.name} 
                  variant="outline" 
                  className="text-[10px]"
                  style={{ borderColor: type.color, color: type.color }}
                >
                  {type.name}: {type.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card className="card-moodita">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium">Actividad — {RANGE_LABELS[range]}</CardTitle>
          <Select value={range} onValueChange={(v) => setRange(v as TimelineRange)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="creadas"
                  name="Creadas"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.3)"
                />
                <Area
                  type="monotone"
                  dataKey="resueltas"
                  name="Resueltas"
                  stackId="2"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success) / 0.3)"
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
