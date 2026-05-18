import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ChevronDown,
  Receipt, CreditCard, Landmark, DollarSign, Wallet, Plus, BarChart3, AreaChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useFinanzasPanel, PeriodFilter } from '@/hooks/useFinanzasPanel';

const fmt = (v: number) =>
  `€${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtTrend = (v: number | null) => {
  if (v === null) return null;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este año' },
  { value: 'rolling12', label: '12 meses' },
];

interface Props {
  artistId: string;
}

export function FinanzasPanelTab({ artistId }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'bar'>('bar');
  const navigate = useNavigate();
  const data = useFinanzasPanel(artistId, period);

  if (data.loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end"><Skeleton className="h-9 w-72" /></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  // ── Empty state ──
  if (data.isEmpty) {
    return (
      <div className="space-y-6">
        {/* Period selector still shown */}
        <div className="flex justify-end">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
        <Card className="card-moodita">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tu panel financiero está listo</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Registra tu primer cobro en la pestaña Cobros o liquida una factura en Pagos para ver datos aquí.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/finanzas/cobros')}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir cobro
              </Button>
              <Button variant="outline" onClick={() => navigate('/finanzas/pagos')}>
                Ver Pagos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector + accounting legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Comprometido <span className="opacity-70">· contabilidad real</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Previsto / Pipeline <span className="opacity-70">· no se suma</span>
          </span>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* Alert Banner */}
      {data.alertCount > 0 && (
        <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                <span>⚠ {data.alertCount} situacion{data.alertCount !== 1 ? 'es' : ''} requieren atención</span>
              </div>
              <div className="flex items-center gap-2 text-destructive text-xs">
                <span>Ver detalles</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${alertsOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1.5 pl-2">
              {data.cobrosVencidos > 0 && (
                <button onClick={() => navigate('/finanzas/cobros')} className="flex items-center gap-2 text-sm text-destructive/80 hover:text-destructive transition-colors w-full text-left">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {data.cobrosVencidos} cobro{data.cobrosVencidos !== 1 ? 's' : ''} vencido{data.cobrosVencidos !== 1 ? 's' : ''}
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </button>
              )}
              {data.presupuestosExcedidos > 0 && (
                <button onClick={() => navigate('/finanzas/presupuestos')} className="flex items-center gap-2 text-sm text-destructive/80 hover:text-destructive transition-colors w-full text-left">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {data.presupuestosExcedidos} presupuesto{data.presupuestosExcedidos !== 1 ? 's' : ''} excedido{data.presupuestosExcedidos !== 1 ? 's' : ''}
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </button>
              )}
              {data.unreadNotifCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  {data.unreadNotifCount} notificación{data.unreadNotifCount !== 1 ? 'es' : ''} de cobro sin leer
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* KPI Cards Row 1 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Ingresos Brutos */}
        <Card className="card-moodita border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Brutos</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{fmt(data.ingresosBrutos)}</span>
              <TrendBadge value={data.ingresosTrend} />
            </div>
            <p className="text-xs text-muted-foreground">{data.cobrosCount} cobro{data.cobrosCount !== 1 ? 's' : ''} registrado{data.cobrosCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        {/* Gastos Comprometidos */}
        <Card className="card-moodita border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Comprometidos</CardTitle>
            <Wallet className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.gastosComprometidos)}</div>
            {data.gastosPrevistos > 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                + {fmt(data.gastosPrevistos)} previstos (sin confirmar)
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Sin gastos provisionales</p>
            )}
          </CardContent>
        </Card>

        {/* Resultado: contable + proyectado */}
        <Card className={`card-moodita border-l-4 ${data.resultadoContable >= 0 ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado Contable</CardTitle>
            {data.resultadoContable >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${data.resultadoContable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {data.resultadoContable < 0 ? '-' : ''}{fmt(data.resultadoContable)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.resultadoContable >= 0 ? `Margen ${data.margenPct}%` : `Pérdida ${Math.abs(data.margenPct)}%`}
              {' · '}
              <span className="text-amber-600 dark:text-amber-400">
                Proyectado {data.resultadoProyectado < 0 ? '-' : ''}{fmt(data.resultadoProyectado)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Por cobrar (comprometido) */}
        <Card
          className={`card-moodita border-l-4 cursor-pointer hover:border-primary/30 transition-colors ${data.vencidosCount > 0 ? 'border-l-destructive' : 'border-l-blue-500'}`}
          onClick={() => navigate('/finanzas/cobros')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar (comprometido)</CardTitle>
            <Receipt className={`h-4 w-4 ${data.vencidosCount > 0 ? 'text-destructive' : 'text-blue-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.cobrosComprometidos)}</div>
            <p className="text-xs text-muted-foreground">
              {data.eventosSinCobrar} evento{data.eventosSinCobrar !== 1 ? 's' : ''} confirmado{data.eventosSinCobrar !== 1 ? 's' : ''}
              {data.vencidosCount > 0 && <span className="text-destructive"> · {data.vencidosCount} vencido{data.vencidosCount !== 1 ? 's' : ''}</span>}
            </p>
            {data.pipelineIngresos > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/booking'); }}
                className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                + {fmt(data.pipelineIngresos)} en pipeline ({data.pipelineCount} oferta{data.pipelineCount !== 1 ? 's' : ''})
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </CardContent>
        </Card>

        {/* Pagos Pendientes */}
        <Card
          className="card-moodita border-l-4 border-l-orange-500 cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate('/finanzas/pagos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.pagosPendientes)}</div>
            <p className="text-xs text-muted-foreground">
              {data.facturasPendientes} factura{data.facturasPendientes !== 1 ? 's' : ''} sin liquidar
            </p>
            {data.pagosSinJustificanteCount > 0 && (
              <div
                className="mt-2 text-[11px] rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-2 py-1 flex items-start gap-1"
                title="Pagos realizados sin factura ni recibo. Pendientes de regularizar con la gestoría."
              >
                <span>⚠</span>
                <span>
                  Sin justificante: <strong>{fmt(data.pagosSinJustificante)}</strong> ({data.pagosSinJustificanteCount} línea{data.pagosSinJustificanteCount !== 1 ? 's' : ''}) — pendiente de regularizar
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retenciones IRPF */}
        <Card
          className="card-moodita border-l-4 border-l-violet-500 cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate('/finanzas/fiscal')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retenciones IRPF</CardTitle>
            <Landmark className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.irpfTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {data.quarterLabel} · Pendiente presentar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ingresos vs Gastos Chart */}
      {data.chartData.length > 0 && (
        <Card className="card-moodita">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Ingresos vs Gastos</CardTitle>
            <div className="inline-flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-sm transition-colors ${chartType === 'area' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Área"
              >
                <AreaChartIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-sm transition-colors ${chartType === 'bar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Barras"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={data.chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [fmt(value), '']} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={data.chartData}>
                    <defs>
                      <linearGradient id="ingresosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gastosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [fmt(value), '']} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="hsl(142, 71%, 45%)" fill="url(#ingresosGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="gastos" name="Gastos" stroke="hsl(38, 92%, 50%)" fill="url(#gastosGrad)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            {(data.bestMonth || data.worstMonth) && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {data.bestMonth && <>Mejor mes: <span className="font-medium text-foreground">{data.bestMonth.label}</span> ({fmt(data.bestMonth.ingresos)})</>}
                {data.bestMonth && data.worstMonth && ' · '}
                {data.worstMonth && <>Peor mes: <span className="font-medium text-foreground">{data.worstMonth.label}</span> ({fmt(data.worstMonth.ingresos)})</>}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Breakdown */}
      {(data.sourceBreakdown.some(s => s.value > 0) || data.topArtists.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Donut by source */}
          <Card className="card-moodita">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ingresos por fuente</CardTitle>
            </CardHeader>
            <CardContent>
              {data.sourceBreakdown.some(s => s.value > 0) ? (
                <div className="flex items-center gap-6">
                  <div className="w-[140px] h-[140px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.sourceBreakdown.filter(s => s.value > 0)}
                          cx="50%" cy="50%"
                          innerRadius={40} outerRadius={65}
                          dataKey="value"
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        >
                          {data.sourceBreakdown.filter(s => s.value > 0).map((s, i) => (
                            <Cell key={i} fill={s.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    {data.sourceBreakdown.map(s => {
                      const totalIngresos = data.sourceBreakdown.reduce((sum, x) => sum + x.value, 0);
                      const pct = totalIngresos > 0 ? ((s.value / totalIngresos) * 100).toFixed(1) : '0';
                      return (
                        <div key={s.name} className={`flex items-center gap-2 text-sm ${s.value === 0 ? 'opacity-40' : ''}`}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="truncate">{s.emoji} {s.label}</span>
                          <span className="ml-auto font-medium tabular-nums flex-shrink-0">{fmt(s.value)}</span>
                          <span className="text-muted-foreground text-xs flex-shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Sin ingresos en este período</p>
              )}
            </CardContent>
          </Card>

          {/* Top artists (all) OR Concept breakdown (single artist) */}
          {artistId === 'all' ? (
            <Card className="card-moodita">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top artistas por ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topArtists.length > 0 ? (
                  <div className="space-y-3">
                    {data.topArtists.map((a, i) => (
                      <div key={a.artistId} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={a.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">{a.artistName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.artistName}</p>
                          <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.percentage}%` }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{fmt(a.total)}</p>
                          <p className="text-[10px] text-muted-foreground">{a.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin datos en este período</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-moodita">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Desglose de ingresos{data.selectedArtistName ? ` · ${data.selectedArtistName}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.artistConceptBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const totalArtist = data.artistConceptBreakdown.reduce((s, c) => s + c.value, 0);
                      return data.artistConceptBreakdown.map(c => {
                        const pct = totalArtist > 0 ? (c.value / totalArtist) * 100 : 0;
                        return (
                          <div key={c.name} className="flex items-center gap-3">
                            <span className="text-base flex-shrink-0">{c.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.label}</p>
                              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold tabular-nums">{fmt(c.value)}</p>
                              <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Sin ingresos{data.selectedArtistName ? ` de ${data.selectedArtistName}` : ''} en este período
                    </p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/finanzas/cobros')}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Añadir cobro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos registrados en este período</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map(event => (
                <div key={event.id} className="flex items-center gap-3 group">
                  <span className="text-base flex-shrink-0">{event.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{event.description}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {event.artistName && <>{event.artistName} · </>}
                      {event.relativeDate}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${event.isExpense ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {event.isExpense ? '-' : ''}{fmt(event.amount)}
                  </span>
                  {event.link && (
                    <button
                      onClick={() => navigate(event.link!)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ──

function PeriodSelector({ period, onChange }: { period: PeriodFilter; onChange: (p: PeriodFilter) => void }) {
  return (
    <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
      {PERIOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            period === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const formatted = fmtTrend(value);
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {formatted}
    </span>
  );
}
