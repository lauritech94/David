import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Download, CheckCircle, Plus, Lock } from 'lucide-react';
import { exportToCSV } from '@/utils/exportUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Retention {
  id: string;
  provider_name: string;
  provider_nif: string | null;
  concepto: string;
  base_imponible: number;
  irpf_percentage: number;
  importe_retenido: number;
  fecha_pago: string | null;
  trimestre: string;
  ejercicio: number;
  is_manual: boolean;
  budget_id: string | null;
  created_at: string;
}

interface QuarterStatus {
  id?: string;
  trimestre: string;
  ejercicio: number;
  presentado: boolean;
  fecha_presentacion: string | null;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_LABELS: Record<string, string> = {
  Q1: 'Ene – Mar',
  Q2: 'Abr – Jun',
  Q3: 'Jul – Sep',
  Q4: 'Oct – Dic',
};

function getCurrentQuarter(): string {
  const m = new Date().getMonth();
  if (m < 3) return 'Q1';
  if (m < 6) return 'Q2';
  if (m < 9) return 'Q3';
  return 'Q4';
}

function isQuarterPast(q: string, year: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  if (year < currentYear) return true;
  if (year > currentYear) return false;
  const qIdx = QUARTERS.indexOf(q);
  const currentQIdx = QUARTERS.indexOf(getCurrentQuarter());
  return qIdx < currentQIdx;
}

interface FiscalTabProps {
  artistId: string;
}

export function FiscalTab({ artistId }: FiscalTabProps) {
  const { user } = useAuth();
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [quarterStatuses, setQuarterStatuses] = useState<QuarterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [openQuarters, setOpenQuarters] = useState<Set<string>>(new Set());
  const [addManualOpen, setAddManualOpen] = useState(false);
  const [presentadoDialog, setPresentadoDialog] = useState<string | null>(null);
  const [presentadoDate, setPresentadoDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualForm, setManualForm] = useState({
    provider_name: '',
    provider_nif: '',
    concepto: '',
    base_imponible: '',
    irpf_percentage: '15',
    fecha_pago: '',
    trimestre: 'Q1',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user, currentYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.workspace_id) { setLoading(false); return; }
      setWorkspaceId(profile.workspace_id);

      const [retRes, statusRes] = await Promise.all([
        supabase
          .from('irpf_retentions')
          .select('*')
          .eq('workspace_id', profile.workspace_id)
          .eq('ejercicio', currentYear)
          .order('fecha_pago', { ascending: true }),
        supabase
          .from('irpf_quarter_status')
          .select('*')
          .eq('workspace_id', profile.workspace_id)
          .eq('ejercicio', currentYear),
      ]);

      setRetentions((retRes.data as any[]) || []);
      setQuarterStatuses((statusRes.data as any[]) || []);
    } catch (e) {
      console.error('Error loading fiscal data:', e);
    } finally {
      setLoading(false);
    }
  };

  const retentionsByQuarter = useMemo(() => {
    const grouped: Record<string, Retention[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    retentions.forEach(r => { if (grouped[r.trimestre]) grouped[r.trimestre].push(r); });
    return grouped;
  }, [retentions]);

  const getQuarterStatus = (q: string): QuarterStatus =>
    quarterStatuses.find(s => s.trimestre === q) || { trimestre: q, ejercicio: currentYear, presentado: false, fecha_presentacion: null };

  const getQuarterTotals = (q: string) => {
    const items = retentionsByQuarter[q] || [];
    return {
      base: items.reduce((s, i) => s + i.base_imponible, 0),
      retenciones: items.reduce((s, i) => s + i.importe_retenido, 0),
      count: items.length,
      perceptores: new Set(items.map(i => i.provider_name)).size,
    };
  };

  const getStatusBadge = (q: string) => {
    const status = getQuarterStatus(q);
    if (status.presentado) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0">
          <Lock className="h-3 w-3 mr-1" />
          Presentado {status.fecha_presentacion ? new Date(status.fecha_presentacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}
        </Badge>
      );
    }
    if (isQuarterPast(q, currentYear)) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 animate-pulse text-[10px]">
          Pendiente presentar
        </Badge>
      );
    }
    if (q === getCurrentQuarter() && currentYear === new Date().getFullYear()) {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] border-0">Abierto</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">Futuro</Badge>;
  };

  const handleMarkPresentado = async (q: string) => {
    if (!workspaceId) return;
    try {
      const { error } = await supabase
        .from('irpf_quarter_status')
        .upsert({
          workspace_id: workspaceId,
          ejercicio: currentYear,
          trimestre: q,
          presentado: true,
          fecha_presentacion: presentadoDate,
          presentado_por: user!.id,
        } as any, { onConflict: 'workspace_id,ejercicio,trimestre' });
      if (error) throw error;
      toast.success('Trimestre marcado como presentado');
      setPresentadoDialog(null);
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar');
    }
  };

  const handleExportQuarter = (q: string) => {
    const items = retentionsByQuarter[q] || [];
    if (items.length === 0) { toast.error('No hay datos para exportar'); return; }
    const totals = getQuarterTotals(q);
    const exportData = items.map(i => ({
      Perceptor: i.provider_name,
      NIF: i.provider_nif || '',
      Concepto: i.concepto,
      'Base Imponible': i.base_imponible.toFixed(2),
      'IRPF %': i.irpf_percentage,
      'Importe Retenido': i.importe_retenido.toFixed(2),
      'Fecha Pago': i.fecha_pago || '',
    }));
    exportData.push({
      Perceptor: `--- RESUMEN T${q.slice(1)} ${currentYear} ---`,
      NIF: `Perceptores: ${totals.perceptores}`,
      Concepto: '',
      'Base Imponible': totals.base.toFixed(2),
      'IRPF %': '' as any,
      'Importe Retenido': totals.retenciones.toFixed(2),
      'Fecha Pago': '',
    });
    exportToCSV(exportData, `modelo_111_${currentYear}_T${q.slice(1)}`);
    toast.success(`Exportado T${q.slice(1)} ${currentYear}`);
  };

  const handleAddManual = async () => {
    if (!workspaceId || !manualForm.provider_name || !manualForm.concepto || !manualForm.base_imponible) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSaving(true);
    try {
      const base = parseFloat(manualForm.base_imponible);
      const irpfPct = parseFloat(manualForm.irpf_percentage);
      const importe = base * (irpfPct / 100);
      const { error } = await supabase.from('irpf_retentions').insert({
        workspace_id: workspaceId,
        provider_name: manualForm.provider_name,
        provider_nif: manualForm.provider_nif || null,
        concepto: manualForm.concepto,
        base_imponible: base,
        irpf_percentage: irpfPct,
        importe_retenido: importe,
        fecha_pago: manualForm.fecha_pago || null,
        trimestre: manualForm.trimestre,
        ejercicio: currentYear,
        is_manual: true,
        created_by: user!.id,
      } as any);
      if (error) throw error;
      toast.success('Retención añadida');
      setAddManualOpen(false);
      setManualForm({ provider_name: '', provider_nif: '', concepto: '', base_imponible: '', irpf_percentage: '15', fecha_pago: '', trimestre: 'Q1' });
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleQuarter = (q: string) => {
    const next = new Set(openQuarters);
    if (next.has(q)) next.delete(q); else next.add(q);
    setOpenQuarters(next);
  };

  const fmt = (n: number) => `€${n.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modelo 111 — Retenciones IRPF</h2>
          <p className="text-muted-foreground text-sm">Ejercicio {currentYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <button
                key={y}
                onClick={() => setCurrentYear(y)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentYear === y
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <Button onClick={() => setAddManualOpen(true)} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Añadir retención
          </Button>
        </div>
      </div>

      {/* Quarterly overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUARTERS.map(q => {
          const totals = getQuarterTotals(q);
          const status = getQuarterStatus(q);
          const isPastPending = isQuarterPast(q, currentYear) && !status.presentado;

          return (
            <Card
              key={q}
              className={cn(
                'cursor-pointer hover:shadow-md transition-shadow',
                status.presentado && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10',
                isPastPending && 'border-destructive/50 ring-1 ring-destructive/20',
              )}
              onClick={() => toggleQuarter(q)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">T{q.slice(1)}: {QUARTER_LABELS[q]}</CardTitle>
                  {getStatusBadge(q)}
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base imponible</span>
                  <span className="font-medium">{fmt(totals.base)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retenciones</span>
                  <span className="font-bold">{fmt(totals.retenciones)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {totals.perceptores} perceptor(es) · {totals.count} registro(s)
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quarter detail views */}
      {QUARTERS.map(q => {
        const items = retentionsByQuarter[q] || [];
        const status = getQuarterStatus(q);
        const totals = getQuarterTotals(q);

        return (
          <Collapsible key={q} open={openQuarters.has(q)} onOpenChange={() => toggleQuarter(q)}>
            {openQuarters.has(q) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 rotate-180" />
                      <CardTitle className="text-base">T{q.slice(1)} — {QUARTER_LABELS[q]} {currentYear}</CardTitle>
                      <Badge variant="outline" className="text-xs">{items.length} registros</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExportQuarter(q)} disabled={items.length === 0}>
                        <Download className="h-3.5 w-3.5 mr-1" /> Exportar para gestor
                      </Button>
                      {!status.presentado && (
                        <Button size="sm" onClick={() => setPresentadoDialog(q)} disabled={items.length === 0}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Marcar presentado
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Sin retenciones en este trimestre</p>
                    ) : (
                      <>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Perceptor</TableHead>
                                <TableHead>NIF</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead className="text-right">Base imponible</TableHead>
                                <TableHead className="text-right">IRPF %</TableHead>
                                <TableHead className="text-right">Retención</TableHead>
                                <TableHead>Fecha pago</TableHead>
                                <TableHead>Origen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map(r => (
                                <TableRow key={r.id}>
                                  <TableCell className="font-medium">{r.provider_name}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{r.provider_nif || '—'}</TableCell>
                                  <TableCell>{r.concepto}</TableCell>
                                  <TableCell className="text-right">{fmt(r.base_imponible)}</TableCell>
                                  <TableCell className="text-right">{r.irpf_percentage}%</TableCell>
                                  <TableCell className="text-right font-medium">{fmt(r.importe_retenido)}</TableCell>
                                  <TableCell className="text-sm">{r.fecha_pago || '—'}</TableCell>
                                  <TableCell>
                                    <Badge variant={r.is_manual ? 'outline' : 'secondary'} className="text-[10px]">
                                      {r.is_manual ? 'Manual' : 'Auto'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-end gap-6 mt-3 text-sm">
                          <span className="text-muted-foreground">Total base: <strong>{fmt(totals.base)}</strong></span>
                          <span className="text-muted-foreground">Total retenciones: <strong>{fmt(totals.retenciones)}</strong></span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            )}
          </Collapsible>
        );
      })}

      {/* Add manual retention dialog */}
      <Dialog open={addManualOpen} onOpenChange={setAddManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir retención manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Perceptor *</Label>
              <Input value={manualForm.provider_name} onChange={e => setManualForm(f => ({ ...f, provider_name: e.target.value }))} placeholder="Nombre del perceptor" />
            </div>
            <div>
              <Label>NIF</Label>
              <Input value={manualForm.provider_nif} onChange={e => setManualForm(f => ({ ...f, provider_nif: e.target.value }))} placeholder="NIF / CIF" />
            </div>
            <div>
              <Label>Concepto *</Label>
              <Input value={manualForm.concepto} onChange={e => setManualForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Descripción" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base imponible (€) *</Label>
                <Input type="number" step="0.01" value={manualForm.base_imponible} onChange={e => setManualForm(f => ({ ...f, base_imponible: e.target.value }))} />
              </div>
              <div>
                <Label>IRPF %</Label>
                <Input type="number" step="0.5" value={manualForm.irpf_percentage} onChange={e => setManualForm(f => ({ ...f, irpf_percentage: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de pago</Label>
                <Input type="date" value={manualForm.fecha_pago} onChange={e => setManualForm(f => ({ ...f, fecha_pago: e.target.value }))} />
              </div>
              <div>
                <Label>Trimestre</Label>
                <Select value={manualForm.trimestre} onValueChange={v => setManualForm(f => ({ ...f, trimestre: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map(q => <SelectItem key={q} value={q}>T{q.slice(1)} — {QUARTER_LABELS[q]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddManualOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddManual} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as presentado dialog */}
      <Dialog open={!!presentadoDialog} onOpenChange={() => setPresentadoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar T{presentadoDialog?.slice(1)} como presentado</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Fecha de presentación</Label>
            <Input type="date" value={presentadoDate} onChange={e => setPresentadoDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresentadoDialog(null)}>Cancelar</Button>
            <Button onClick={() => presentadoDialog && handleMarkPresentado(presentadoDialog)}>
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
