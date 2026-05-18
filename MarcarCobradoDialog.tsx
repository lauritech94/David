import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getIrpfForArtist, type ArtistFiscalProfile } from '@/utils/irpf';
import { AlertTriangle, Pencil } from 'lucide-react';

interface MarcarCobradoDialogProps {
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
  };
  onSuccess?: () => void;
}

export function MarcarCobradoDialog({ open, onOpenChange, booking, onSuccess }: MarcarCobradoDialogProps) {
  const { user } = useAuth();
  const eventName = booking.festival_ciclo || booking.venue || booking.ciudad || 'Evento';
  const defaultAmount = booking.fee || 0;

  // Fiscal profile state
  const [artistFiscal, setArtistFiscal] = useState<ArtistFiscalProfile | null>(null);
  const [loadingFiscal, setLoadingFiscal] = useState(false);
  const [irpfOverride, setIrpfOverride] = useState<number | null>(null);
  const [editingIrpf, setEditingIrpf] = useState(false);

  const [cobroFecha, setCobroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [importeRecibido, setImporteRecibido] = useState(defaultAmount);
  const [metodo, setMetodo] = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch artist fiscal profile when dialog opens
  useEffect(() => {
    if (open && booking.artist_id) {
      fetchArtistFiscal();
    }
    if (!open) {
      setIrpfOverride(null);
      setEditingIrpf(false);
    }
  }, [open, booking.artist_id]);

  const fetchArtistFiscal = async () => {
    if (!booking.artist_id) return;
    setLoadingFiscal(true);
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('irpf_type, irpf_porcentaje, actividad_inicio')
        .eq('id', booking.artist_id)
        .maybeSingle();

      if (!error && data) {
        setArtistFiscal(data as ArtistFiscalProfile);
      }
    } catch (e) {
      console.error('Error fetching artist fiscal profile:', e);
    } finally {
      setLoadingFiscal(false);
    }
  };

  const irpfResult = getIrpfForArtist(artistFiscal);
  const irpfPct = irpfOverride ?? irpfResult.percentage;

  const irpfAmount = importeRecibido * irpfPct / 100;
  const netoRecibido = importeRecibido - irpfAmount;

  const fmt = (v: number) => `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleSubmit = async () => {
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
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

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

      toast({
        title: '✓ Cobro registrado',
        description: `${eventName} movido a Facturado`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error registering cobro:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el cobro.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar cobro — {eventName}</DialogTitle>
          <DialogDescription>Registra los detalles del pago recibido por el evento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fecha de cobro</Label>
            <Input type="date" value={cobroFecha} onChange={e => setCobroFecha(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Importe recibido (€)</Label>
            <Input
              type="number"
              value={importeRecibido}
              onChange={e => setImporteRecibido(Number(e.target.value))}
              min={0}
            />
            <div className="space-y-1.5 text-xs">
              {/* IRPF line with type label and edit option */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground">
                  IRPF retenido ({irpfPct}% — {irpfOverride !== null ? 'Manual' : irpfResult.label}):
                </span>
                <span className="text-destructive font-medium">-{fmt(irpfAmount)}</span>
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

              {/* Warning for graduated inicio_actividad */}
              {irpfResult.warning && irpfOverride === null && (
                <div className="flex items-start gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1.5 text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>{irpfResult.warning}</span>
                </div>
              )}

              <p className="text-muted-foreground">
                Importe neto recibido: <span className="text-primary font-bold">{fmt(netoRecibido)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de cobro</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referencia/concepto bancario <span className="text-muted-foreground">(opcional)</span></Label>
            <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ref. transferencia..." />
          </div>

          <div className="space-y-2">
            <Label>Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
