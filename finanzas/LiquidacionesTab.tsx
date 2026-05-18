import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, ChevronDown, DollarSign, Clock, Landmark, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const fmt = (v: number) =>
  `€${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  transferido: { label: 'Transferido', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  parcial: { label: 'Parcial', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

interface LiquidacionRow {
  id: string;
  artist_id: string | null;
  project_id: string | null;
  concepto: string;
  cache_bruto: number;
  irpf_pct: number;
  irpf_amount: number;
  neto_a_transferir: number;
  fecha_pago: string | null;
  metodo_pago: string | null;
  status: string;
  notes: string | null;
  artists?: { name: string; stage_name?: string | null; avatar_url?: string | null } | null;
  projects?: { name: string } | null;
}

interface LiquidacionesTabProps {
  artistId: string;
}

export function LiquidacionesTab({ artistId }: LiquidacionesTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState<string | null>(null);
  const [markDate, setMarkDate] = useState(new Date().toISOString().slice(0, 10));
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    artist_id: '',
    concepto: '',
    project_id: '',
    cache_bruto: '',
    irpf_pct: '15',
    fecha_pago: '',
    metodo_pago: 'transferencia',
    notes: '',
  });

  // Fetch workspace
  const { data: profile } = useQuery({
    queryKey: ['profile-workspace', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('workspace_id').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch liquidaciones
  const { data: liquidaciones = [], isLoading } = useQuery({
    queryKey: ['liquidaciones', profile?.workspace_id, artistId, currentYear],
    queryFn: async () => {
      let q = supabase
        .from('liquidaciones')
        .select('*, artists:artist_id(name, stage_name, avatar_url), projects:project_id(name)')
        .eq('workspace_id', profile!.workspace_id)
        .gte('created_at', `${currentYear}-01-01`)
        .lte('created_at', `${currentYear}-12-31`)
        .order('fecha_pago', { ascending: false });
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return (data || []) as LiquidacionRow[];
    },
    enabled: !!profile?.workspace_id,
  });

  // Fetch artists for selector
  const { data: artists = [] } = useQuery({
    queryKey: ['artists-list', profile?.workspace_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('artists')
        .select('id, name, stage_name, avatar_url')
        .eq('workspace_id', profile!.workspace_id)
        .order('name');
      return data || [];
    },
    enabled: !!profile?.workspace_id,
  });

  // Fetch projects for selector
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list-liq'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      return data || [];
    },
  });

  // Add liquidación
  const addMutation = useMutation({
    mutationFn: async () => {
      const bruto = parseFloat(form.cache_bruto);
      const irpf = parseFloat(form.irpf_pct);
      const { error } = await supabase.from('liquidaciones').insert({
        workspace_id: profile!.workspace_id,
        artist_id: form.artist_id || null,
        project_id: form.project_id || null,
        concepto: form.concepto,
        cache_bruto: bruto,
        irpf_pct: irpf,
        fecha_pago: form.fecha_pago || null,
        metodo_pago: form.metodo_pago,
        notes: form.notes || null,
        status: 'pendiente',
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Liquidación añadida');
      setAddOpen(false);
      setForm({ artist_id: '', concepto: '', project_id: '', cache_bruto: '', irpf_pct: '15', fecha_pago: '', metodo_pago: 'transferencia', notes: '' });
    },
    onError: () => toast.error('Error al guardar'),
  });

  // Mark as transferido
  const markMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('liquidaciones')
        .update({ status: 'transferido', fecha_pago: markDate } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Marcado como transferido');
      setMarkOpen(null);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  // Group by artist
  const grouped = useMemo(() => {
    const map = new Map<string, { artist: LiquidacionRow['artists']; items: LiquidacionRow[] }>();
    liquidaciones.forEach(l => {
      const key = l.artist_id || 'sin-artista';
      if (!map.has(key)) map.set(key, { artist: l.artists, items: [] });
      map.get(key)!.items.push(l);
    });
    return Array.from(map.entries());
  }, [liquidaciones]);

  // Summary
  const totalLiquidado = liquidaciones.filter(l => l.status === 'transferido').reduce((s, l) => s + l.neto_a_transferir, 0);
  const totalPendiente = liquidaciones.filter(l => l.status === 'pendiente').reduce((s, l) => s + l.neto_a_transferir, 0);
  const totalRetenciones = liquidaciones.filter(l => l.status === 'transferido').reduce((s, l) => s + l.irpf_amount, 0);

  const toggleArtist = (key: string) => {
    const next = new Set(expandedArtists);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedArtists(next);
  };

  // Real-time preview in form
  const previewBruto = parseFloat(form.cache_bruto) || 0;
  const previewIrpf = previewBruto * (parseFloat(form.irpf_pct) || 0) / 100;
  const previewNeto = previewBruto - previewIrpf;

  return (
    <div className="space-y-6">
      {/* Banner link to fiscal */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
        <Landmark className="h-4 w-4 flex-shrink-0" />
        <span>Las retenciones practicadas se acumulan automáticamente en la vista Fiscal</span>
        <button
          onClick={() => navigate('/finanzas/fiscal')}
          className="ml-auto text-primary hover:underline text-xs font-medium flex items-center gap-1"
        >
          Ver Modelo 111 <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Header cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-moodita border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liquidado este año</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalLiquidado)}</div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de liquidar</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalPendiente)}</div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retenciones practicadas</CardTitle>
            <Landmark className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalRetenciones)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Añadir liquidación
        </Button>
      </div>

      {/* Grouped list */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No hay liquidaciones registradas</p>
        </div>
      ) : (
        grouped.map(([key, { artist, items }]) => {
          const artistTotal = items.filter(i => i.status === 'transferido').reduce((s, i) => s + i.neto_a_transferir, 0);
          const artistRetenciones = items.filter(i => i.status === 'transferido').reduce((s, i) => s + i.irpf_amount, 0);
          const isOpen = expandedArtists.has(key);

          return (
            <Collapsible key={key} open={isOpen} onOpenChange={() => toggleArtist(key)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={artist?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{(artist?.stage_name || artist?.name || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{artist?.stage_name || artist?.name || 'Sin artista'}</p>
                          <p className="text-xs text-muted-foreground">{items.length} liquidación{items.length !== 1 ? 'es' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-right">
                        <div>
                          <p className="text-muted-foreground">Liquidado</p>
                          <p className="font-medium">{fmt(artistTotal)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Retenciones</p>
                          <p className="font-medium">{fmt(artistRetenciones)}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="p-3 rounded-lg border border-border bg-card/50 flex items-start gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium">{item.concepto}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.projects && (
                              <Badge variant="outline" className="text-[10px] py-0">{item.projects.name}</Badge>
                            )}
                            {item.fecha_pago && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_CONFIG[item.status]?.className)}>
                              {STATUS_CONFIG[item.status]?.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-0.5">
                          <p className="text-xs text-muted-foreground tabular-nums">Caché: {fmt(item.cache_bruto)}</p>
                          {item.irpf_amount > 0 && (
                            <p className="text-xs text-destructive/70 tabular-nums">IRPF ({item.irpf_pct}%): -{fmt(item.irpf_amount)}</p>
                          )}
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            A transferir: {fmt(item.neto_a_transferir)}
                          </p>
                        </div>
                        {item.status === 'pendiente' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="self-center text-xs flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); setMarkOpen(item.id); }}
                          >
                            Marcar transferido
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Añadir liquidación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Artista</Label>
              <Select value={form.artist_id} onValueChange={v => setForm(f => ({ ...f, artist_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar artista" /></SelectTrigger>
                <SelectContent>
                  {artists.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.stage_name || a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concepto *</Label>
              <Input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Evento, proyecto..." />
            </div>
            <div>
              <Label>Proyecto vinculado</Label>
              <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Caché bruto (€) *</Label>
                <Input type="number" step="0.01" value={form.cache_bruto} onChange={e => setForm(f => ({ ...f, cache_bruto: e.target.value }))} />
              </div>
              <div>
                <Label>% IRPF</Label>
                <Input type="number" step="0.5" value={form.irpf_pct} onChange={e => setForm(f => ({ ...f, irpf_pct: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de pago</Label>
                <Input type="date" value={form.fecha_pago} onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} />
              </div>
              <div>
                <Label>Método de pago</Label>
                <Select value={form.metodo_pago} onValueChange={v => setForm(f => ({ ...f, metodo_pago: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            {/* Live preview */}
            {previewBruto > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caché bruto</span>
                  <span className="font-medium">{fmt(previewBruto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IRPF ({form.irpf_pct}%)</span>
                  <span className="text-destructive">-{fmt(previewIrpf)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">A transferir</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(previewNeto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600 dark:text-purple-400 text-xs">A ingresar Hacienda</span>
                  <span className="text-purple-600 dark:text-purple-400 text-xs font-medium">{fmt(previewIrpf)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!form.concepto || !form.cache_bruto || addMutation.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as transferido dialog */}
      <Dialog open={!!markOpen} onOpenChange={() => setMarkOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como transferido</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Fecha de transferencia</Label>
            <Input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(null)}>Cancelar</Button>
            <Button onClick={() => markOpen && markMutation.mutate(markOpen)} disabled={markMutation.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
