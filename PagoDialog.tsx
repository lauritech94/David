import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getIrpfForArtist, type ArtistFiscalProfile } from '@/utils/irpf';
import { AlertTriangle, Pencil, Check, Clock } from 'lucide-react';

interface PagoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    festival_ciclo?: string;
    venue?: string;
    ciudad?: string;
    fee?: number;
    artist_id?: string;
    project_id?: string;
    comision_porcentaje?: number;
    fecha?: string;
    anticipo_porcentaje?: number;
    anticipo_importe?: number;
    anticipo_fecha_esperada?: string;
    anticipo_fecha_cobro?: string;
    anticipo_estado?: string;
    anticipo_referencia?: string;
    liquidacion_importe?: number;
    liquidacion_fecha_esperada?: string;
    liquidacion_fecha_cobro?: string;
    liquidacion_estado?: string;
    liquidacion_referencia?: string;
    cobro_estado?: string;
    cobro_fecha?: string;
    cobro_importe?: number;
    cobro_metodo?: string;
    cobro_referencia?: string;
    cobro_notas?: string;
  };
  editMode?: boolean;
  onSuccess?: () => void;
}

export function PagoDialog({ open, onOpenChange, booking, editMode, onSuccess }: PagoDialogProps) {
  const { user } = useAuth();
  const eventName = booking.festival_ciclo || booking.venue || booking.ciudad || 'Evento';
  const totalFee = booking.fee || 0;

  // Fiscal profile
  const [artistFiscal, setArtistFiscal] = useState<ArtistFiscalProfile | null>(null);
  const [irpfOverride, setIrpfOverride] = useState<number | null>(null);
  const [editingIrpf, setEditingIrpf] = useState(false);

  // Determine initial mode based on existing data
  const hasExistingPartial = booking.anticipo_estado === 'cobrado' || booking.cobro_estado === 'anticipo_cobrado';
  const isExistingUnico = booking.cobro_estado === 'cobrado_completo' && booking.anticipo_estado === 'no_aplica';
  const [mode, setMode] = useState<'unico' | 'fraccionado'>(hasExistingPartial ? 'fraccionado' : isExistingUnico ? 'unico' : 'unico');

  // === Pago Único state (prefill in edit mode) ===
  const [cobroFecha, setCobroFecha] = useState(editMode && booking.cobro_fecha ? booking.cobro_fecha : new Date().toISOString().split('T')[0]);
  const [importeRecibido, setImporteRecibido] = useState(editMode && booking.cobro_importe ? booking.cobro_importe : totalFee);
  const [metodo, setMetodo] = useState(editMode && booking.cobro_metodo ? booking.cobro_metodo : 'transferencia');
  const [referencia, setReferencia] = useState(editMode && booking.cobro_referencia ? booking.cobro_referencia : '');
  const [notas, setNotas] = useState(editMode && booking.cobro_notas ? booking.cobro_notas : '');

  // === Fraccionado state ===
  const [anticipoPct, setAnticipoPct] = useState(booking.anticipo_porcentaje ?? 50);
  const [anticipoImporte, setAnticipoImporte] = useState(booking.anticipo_importe ?? totalFee * 0.5);
  // Calculate default dates: anticipo = event - 30d, liquidacion = event + 7d
  const defaultAnticipoFecha = (() => {
    if (booking.anticipo_fecha_esperada) return booking.anticipo_fecha_esperada;
    if (!booking.fecha) return '';
    const d = new Date(booking.fecha);
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();
  const defaultLiquidacionFecha = (() => {
    if (booking.liquidacion_fecha_esperada) return booking.liquidacion_fecha_esperada;
    if (!booking.fecha) return '';
    const d = new Date(booking.fecha);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const [anticipoFechaEsperada, setAnticipoFechaEsperada] = useState(defaultAnticipoFecha);
  const [anticipoEstado, setAnticipoEstado] = useState<'pendiente' | 'cobrado'>(
    booking.anticipo_estado === 'cobrado' ? 'cobrado' : 'pendiente'
  );
  const [anticipoFechaCobro, setAnticipoFechaCobro] = useState(booking.anticipo_fecha_cobro || new Date().toISOString().split('T')[0]);
  const [anticipoReferencia, setAnticipoReferencia] = useState(booking.anticipo_referencia || '');

  const liquidacionImporte = totalFee - anticipoImporte;
  const [liquidacionFechaEsperada, setLiquidacionFechaEsperada] = useState(defaultLiquidacionFecha);
  const [liquidacionEstado, setLiquidacionEstado] = useState<'pendiente' | 'cobrado'>(
    booking.liquidacion_estado === 'cobrado' ? 'cobrado' : 'pendiente'
  );
  const [liquidacionFechaCobro, setLiquidacionFechaCobro] = useState(booking.liquidacion_fecha_cobro || new Date().toISOString().split('T')[0]);
  const [liquidacionReferencia, setLiquidacionReferencia] = useState(booking.liquidacion_referencia || '');

  const [saving, setSaving] = useState(false);

  // Fetch artist fiscal profile
  useEffect(() => {
    if (open && booking.artist_id) {
      supabase
        .from('artists')
        .select('irpf_type, irpf_porcentaje, actividad_inicio')
        .eq('id', booking.artist_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setArtistFiscal(data as ArtistFiscalProfile);
        });
    }
    if (!open) {
      setIrpfOverride(null);
      setEditingIrpf(false);
    }
  }, [open, booking.artist_id]);

  // Auto-calculate anticipo from percentage
  useEffect(() => {
    setAnticipoImporte(Math.round(totalFee * anticipoPct / 100));
  }, [anticipoPct, totalFee]);

  const irpfResult = getIrpfForArtist(artistFiscal);
  const irpfPct = irpfOverride ?? irpfResult.percentage;

  const fmt = (v: number) => `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Computed summaries for fraccionado mode
  const irpfTotal = totalFee * irpfPct / 100;
  const feeNeto = totalFee - irpfTotal;
  const anticipoNeto = anticipoImporte - (anticipoImporte * irpfPct / 100);
  const liquidacionNeto = liquidacionImporte - (liquidacionImporte * irpfPct / 100);

  const pendienteCobrar = (anticipoEstado === 'pendiente' ? anticipoNeto : 0)
    + (liquidacionEstado === 'pendiente' ? liquidacionNeto : 0);

  // For pago único
  const unicoIrpf = importeRecibido * irpfPct / 100;
  const unicoNeto = importeRecibido - unicoIrpf;

  const IrpfLine = () => (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-muted-foreground">
          IRPF ({irpfPct}% — {irpfOverride !== null ? 'Manual' : irpfResult.label}):
        </span>
        {!editingIrpf ? (
          <button
            type="button"
            onClick={() => setEditingIrpf(true)}
            className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-0.5"
          >
            <Pencil className="h-3 w-3" />
            Editar %
          </button>
        ) : (
          <div className="inline-flex items-center gap-1">
            <Input
              type="number"
              className="h-6 w-16 text-xs px-1"
              value={irpfOverride ?? irpfResult.percentage}
              onChange={e => setIrpfOverride(Number(e.target.value))}
              min={0}
              max={100}
            />
            <span className="text-muted-foreground">%</span>
            <button
              type="button"
              onClick={() => { setIrpfOverride(null); setEditingIrpf(false); }}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {irpfResult.warning && irpfOverride === null && (
        <div className="flex items-start gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1.5 text-foreground">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <span>{irpfResult.warning}</span>
        </div>
      )}
    </div>
  );

  const handleSubmitUnico = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error: bookingError } = await supabase
        .from('booking_offers')
        .update({
          phase: 'facturado',
          estado: 'facturado',
          estado_facturacion: 'facturado',
          cobro_fecha: cobroFecha,
          cobro_importe: importeRecibido,
          cobro_metodo: metodo,
          cobro_referencia: referencia || null,
          cobro_notas: notas || null,
          cobro_estado: 'cobrado_completo',
          anticipo_estado: 'no_aplica',
          liquidacion_estado: 'no_aplica',
        } as any)
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      if (editMode) {
        // Update existing cobro records linked to this booking
        await supabase
          .from('cobros')
          .update({
            concept: `Cobro concierto: ${eventName}`,
            amount_gross: importeRecibido,
            irpf_pct: irpfPct,
            received_date: cobroFecha,
            notes: notas || null,
          })
          .eq('booking_id', booking.id)
          .eq('type', 'booking');
      } else {
        const { error: cobroError } = await supabase
          .from('cobros')
          .insert({
            type: 'booking',
            concept: `Cobro concierto: ${eventName}`,
            amount_gross: importeRecibido,
            irpf_pct: irpfPct,
            received_date: cobroFecha,
            status: 'cobrado',
            artist_id: booking.artist_id || null,
            project_id: booking.project_id || null,
            booking_id: booking.id,
            notes: notas || null,
            created_by: user.id,
          });

        if (cobroError) throw cobroError;
      }

      toast({ title: editMode ? '✓ Cobro actualizado' : '✓ Cobro registrado', description: `${eventName} ${editMode ? 'actualizado' : 'movido a Facturado'}` });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error registering cobro:', error);
      toast({ title: 'Error', description: 'No se pudo registrar el cobro.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFraccionado = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Determine overall cobro_estado
      const bothPaid = anticipoEstado === 'cobrado' && liquidacionEstado === 'cobrado';
      const anticipoPaid = anticipoEstado === 'cobrado' && liquidacionEstado === 'pendiente';
      const cobroEstado = bothPaid ? 'cobrado_completo' : anticipoPaid ? 'anticipo_cobrado' : 'pendiente';

      // Determine phase transition
      const shouldTransition = bothPaid;

      const updateData: Record<string, any> = {
        anticipo_porcentaje: anticipoPct,
        anticipo_importe: anticipoImporte,
        anticipo_fecha_esperada: anticipoFechaEsperada || null,
        anticipo_estado: anticipoEstado,
        anticipo_fecha_cobro: anticipoEstado === 'cobrado' ? anticipoFechaCobro : null,
        anticipo_referencia: anticipoEstado === 'cobrado' ? anticipoReferencia || null : null,
        liquidacion_importe: liquidacionImporte,
        liquidacion_fecha_esperada: liquidacionFechaEsperada || null,
        liquidacion_estado: liquidacionEstado,
        liquidacion_fecha_cobro: liquidacionEstado === 'cobrado' ? liquidacionFechaCobro : null,
        liquidacion_referencia: liquidacionEstado === 'cobrado' ? liquidacionReferencia || null : null,
        cobro_estado: cobroEstado,
      };

      if (shouldTransition) {
        updateData.phase = 'facturado';
        updateData.estado = 'facturado';
        updateData.estado_facturacion = 'facturado';
        updateData.cobro_importe = totalFee;
        updateData.cobro_fecha = liquidacionFechaCobro;
      }

      const { error: bookingError } = await supabase
        .from('booking_offers')
        .update(updateData as any)
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Create cobro records for newly marked as cobrado
      const previousAnticipoEstado = booking.anticipo_estado;
      const previousLiquidacionEstado = booking.liquidacion_estado;

      if (anticipoEstado === 'cobrado' && previousAnticipoEstado !== 'cobrado') {
        await supabase.from('cobros').insert({
          type: 'booking',
          concept: `Anticipo ${anticipoPct}% — ${eventName}`,
          amount_gross: anticipoImporte,
          irpf_pct: irpfPct,
          
          received_date: anticipoFechaCobro,
          status: 'cobrado',
          artist_id: booking.artist_id || null,
          project_id: booking.project_id || null,
          booking_id: booking.id,
          notes: `Anticipo ${anticipoPct}%`,
          created_by: user.id,
        });
      }

      if (liquidacionEstado === 'cobrado' && previousLiquidacionEstado !== 'cobrado') {
        await supabase.from('cobros').insert({
          type: 'booking',
          concept: `Liquidación ${100 - anticipoPct}% — ${eventName}`,
          amount_gross: liquidacionImporte,
          irpf_pct: irpfPct,
          
          received_date: liquidacionFechaCobro,
          status: 'cobrado',
          artist_id: booking.artist_id || null,
          project_id: booking.project_id || null,
          booking_id: booking.id,
          notes: `Liquidación ${100 - anticipoPct}%`,
          created_by: user.id,
        });
      }

      const msg = bothPaid
        ? `${eventName} — cobro completo registrado, movido a Facturado`
        : anticipoPaid
        ? `${eventName} — anticipo registrado`
        : `${eventName} — configuración de pagos guardada`;

      toast({ title: '✓ Pagos actualizados', description: msg });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error registering payment:', error);
      toast({ title: 'Error', description: 'No se pudo registrar el pago.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const PaymentStatusBadge = ({ estado }: { estado: string }) => (
    <Badge
      variant={estado === 'cobrado' ? 'default' : 'secondary'}
      className={`text-xs ${estado === 'cobrado' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
    >
      {estado === 'cobrado' ? <><Check className="h-3 w-3 mr-1" /> Cobrado</> : <><Clock className="h-3 w-3 mr-1" /> Pendiente</>}
    </Badge>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Editar cobro' : 'Registrar cobro'} — {eventName}</DialogTitle>
          <DialogDescription>
            Fee total: {fmt(totalFee)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={v => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unico" disabled={hasExistingPartial}>Pago único</TabsTrigger>
            <TabsTrigger value="fraccionado">Anticipo + Liquidación</TabsTrigger>
          </TabsList>

          {/* ===== PAGO ÚNICO ===== */}
          <TabsContent value="unico" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Fecha de cobro</Label>
              <Input type="date" value={cobroFecha} onChange={e => setCobroFecha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Importe recibido (€)</Label>
              <Input type="number" value={importeRecibido} onChange={e => setImporteRecibido(Number(e.target.value))} min={0} />
              <IrpfLine />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">IRPF retenido:</span>
                <span className="text-destructive font-medium">-{fmt(unicoIrpf)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Neto recibido:</span>
                <span className="text-primary font-bold">{fmt(unicoNeto)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método de cobro</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referencia <span className="text-muted-foreground">(opcional)</span></Label>
              <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ref. transferencia..." />
            </div>
            <div className="space-y-2">
              <Label>Notas <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
            </div>
          </TabsContent>

          {/* ===== ANTICIPO + LIQUIDACIÓN ===== */}
          <TabsContent value="fraccionado" className="space-y-4 mt-4">
            <IrpfLine />

            {/* ANTICIPO */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Anticipo</Label>
                <PaymentStatusBadge estado={anticipoEstado} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">% del fee</Label>
                  <Input type="number" value={anticipoPct} onChange={e => setAnticipoPct(Number(e.target.value))} min={0} max={100} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Importe (€)</Label>
                  <Input type="number" value={anticipoImporte} onChange={e => setAnticipoImporte(Number(e.target.value))} min={0} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fecha esperada</Label>
                <Input type="date" value={anticipoFechaEsperada} onChange={e => setAnticipoFechaEsperada(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={anticipoEstado === 'pendiente' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setAnticipoEstado('pendiente')}
                >
                  Pendiente
                </Button>
                <Button
                  type="button"
                  variant={anticipoEstado === 'cobrado' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setAnticipoEstado('cobrado')}
                >
                  Cobrado
                </Button>
              </div>
              {anticipoEstado === 'cobrado' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fecha cobro</Label>
                    <Input type="date" value={anticipoFechaCobro} onChange={e => setAnticipoFechaCobro(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Referencia</Label>
                    <Input value={anticipoReferencia} onChange={e => setAnticipoReferencia(e.target.value)} placeholder="Ref..." />
                  </div>
                </div>
              )}
            </div>

            {/* LIQUIDACIÓN */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Liquidación</Label>
                <PaymentStatusBadge estado={liquidacionEstado} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Importe (€)</Label>
                <div className="text-sm font-medium text-foreground">{fmt(liquidacionImporte)}</div>
                <p className="text-xs text-muted-foreground">Fee total - anticipo</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fecha esperada</Label>
                <Input type="date" value={liquidacionFechaEsperada} onChange={e => setLiquidacionFechaEsperada(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={liquidacionEstado === 'pendiente' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setLiquidacionEstado('pendiente')}
                >
                  Pendiente
                </Button>
                <Button
                  type="button"
                  variant={liquidacionEstado === 'cobrado' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setLiquidacionEstado('cobrado')}
                >
                  Cobrado
                </Button>
              </div>
              {liquidacionEstado === 'cobrado' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fecha cobro</Label>
                    <Input type="date" value={liquidacionFechaCobro} onChange={e => setLiquidacionFechaCobro(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Referencia</Label>
                    <Input value={liquidacionReferencia} onChange={e => setLiquidacionReferencia(e.target.value)} placeholder="Ref..." />
                  </div>
                </div>
              )}
            </div>

            {/* SUMMARY */}
            <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span>Fee total:</span><span className="font-medium">{fmt(totalFee)}</span></div>
              <div className="flex justify-between"><span>IRPF ({irpfPct}%):</span><span className="text-destructive">-{fmt(irpfTotal)}</span></div>
              <div className="flex justify-between"><span>Fee neto:</span><span className="font-bold">{fmt(feeNeto)}</span></div>
              <Separator className="my-1.5" />
              <div className="flex justify-between items-center">
                <span>Anticipo ({anticipoPct}%):</span>
                <span className="inline-flex items-center gap-1">
                  {fmt(anticipoNeto)}
                  {anticipoEstado === 'cobrado' ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Liquidación ({100 - anticipoPct}%):</span>
                <span className="inline-flex items-center gap-1">
                  {fmt(liquidacionNeto)}
                  {liquidacionEstado === 'cobrado' ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </div>
              {pendienteCobrar > 0 && (
                <>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between font-bold text-sm">
                    <span>PENDIENTE COBRAR:</span>
                    <span className="text-primary">{fmt(pendienteCobrar)}</span>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={mode === 'unico' ? handleSubmitUnico : handleSubmitFraccionado}
            disabled={saving}
          >
            {saving ? 'Guardando...' : editMode ? 'Guardar cambios' : mode === 'unico' ? 'Registrar cobro' : 'Guardar pagos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
