import { useState, useEffect, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PagoDialog } from '@/components/PagoDialog';
import { Check, Clock, AlertTriangle, Banknote, Lock, Music, Pencil, RotateCcw, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getIrpfForArtist, type ArtistFiscalProfile } from '@/utils/irpf';

interface PaymentStatusCardProps {
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
    anticipo_estado?: string;
    anticipo_fecha_esperada?: string;
    anticipo_fecha_cobro?: string;
    anticipo_referencia?: string;
    liquidacion_importe?: number;
    liquidacion_estado?: string;
    liquidacion_fecha_esperada?: string;
    liquidacion_fecha_cobro?: string;
    liquidacion_referencia?: string;
    cobro_estado?: string;
    cobro_fecha?: string;
    cobro_importe?: number;
    cobro_referencia?: string;
  };
  highlighted?: boolean;
  onUpdate: () => void;
}

const fmt = (v: number) =>
  `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: es });
  } catch {
    return d;
  }
};

function StatusBadge({ estado, fechaEsperada, locked }: { estado?: string; fechaEsperada?: string; locked?: boolean }) {
  if (locked) {
    return (
      <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-muted/30">
        <Lock className="h-3 w-3 mr-1" /> En espera
      </Badge>
    );
  }
  if (estado === 'cobrado' || estado === 'no_aplica') {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
        <Check className="h-3 w-3 mr-1" /> Cobrado
      </Badge>
    );
  }
  const isOverdue = fechaEsperada && new Date(fechaEsperada) < new Date();
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" /> Vencido
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">
      <Clock className="h-3 w-3 mr-1" /> Pendiente
    </Badge>
  );
}

export const PaymentStatusCard = forwardRef<HTMLDivElement, PaymentStatusCardProps>(
  ({ booking, highlighted, onUpdate }, ref) => {
    const [showPago, setShowPago] = useState(false);
    const [pagoEditMode, setPagoEditMode] = useState(false);
    const [showRevertDialog, setShowRevertDialog] = useState<'unico' | 'anticipo' | 'liquidacion' | null>(null);
    const [reverting, setReverting] = useState(false);
    const [artistFiscal, setArtistFiscal] = useState<ArtistFiscalProfile | null>(null);
    const fee = booking.fee || 0;
    const cobroEstado = booking.cobro_estado;

    const openEditDialog = () => {
      setPagoEditMode(true);
      setShowPago(true);
    };

    const handleRevert = async (type: 'unico' | 'anticipo' | 'liquidacion') => {
      setReverting(true);
      try {
        if (type === 'unico') {
          await supabase
            .from('booking_offers')
            .update({
              cobro_estado: 'pendiente',
              cobro_fecha: null,
              cobro_importe: null,
              cobro_metodo: null,
              cobro_referencia: null,
              cobro_notas: null,
              anticipo_estado: null,
              liquidacion_estado: null,
              phase: 'confirmado',
              estado: 'confirmado',
              estado_facturacion: null,
            } as any)
            .eq('id', booking.id);
          // Delete cobro records
          await supabase.from('cobros').delete().eq('booking_id', booking.id).eq('type', 'booking');
        } else if (type === 'anticipo') {
          await supabase
            .from('booking_offers')
            .update({
              anticipo_estado: 'pendiente',
              anticipo_fecha_cobro: null,
              anticipo_referencia: null,
              cobro_estado: 'pendiente',
            } as any)
            .eq('id', booking.id);
          await supabase.from('cobros').delete().eq('booking_id', booking.id).eq('type', 'booking').ilike('notes', '%anticipo%');
        } else if (type === 'liquidacion') {
          await supabase
            .from('booking_offers')
            .update({
              liquidacion_estado: 'pendiente',
              liquidacion_fecha_cobro: null,
              liquidacion_referencia: null,
              cobro_estado: booking.anticipo_estado === 'cobrado' ? 'anticipo_cobrado' : 'pendiente',
              phase: 'confirmado',
              estado: 'confirmado',
              estado_facturacion: null,
            } as any)
            .eq('id', booking.id);
          await supabase.from('cobros').delete().eq('booking_id', booking.id).eq('type', 'booking').ilike('notes', '%liquidaci%');
        }
        toast({ title: '✓ Estado revertido', description: 'El pago ha sido marcado como pendiente.' });
        setShowRevertDialog(null);
        onUpdate();
      } catch (error) {
        console.error('Error reverting:', error);
        toast({ title: 'Error', description: 'No se pudo revertir el estado.', variant: 'destructive' });
      } finally {
        setReverting(false);
      }
    };

    // Fetch artist fiscal profile for IRPF
    useEffect(() => {
      if (booking.artist_id) {
        supabase
          .from('artists')
          .select('irpf_type, irpf_porcentaje, actividad_inicio')
          .eq('id', booking.artist_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setArtistFiscal(data as ArtistFiscalProfile);
          });
      }
    }, [booking.artist_id]);

    const irpfResult = getIrpfForArtist(artistFiscal);
    const irpfPct = irpfResult.percentage;
    const irpfTotal = fee * irpfPct / 100;
    const feeNeto = fee - irpfTotal;

    // Determine what state we're in
    const hasPayments = cobroEstado && cobroEstado !== 'pendiente';
    const isCobradoCompleto = cobroEstado === 'cobrado_completo';
    const hasFraccionado = booking.anticipo_importe || booking.anticipo_estado === 'cobrado' || cobroEstado === 'anticipo_cobrado';

    // Dependent state: liquidación locked until anticipo is paid
    const anticipoPending = !booking.anticipo_estado || booking.anticipo_estado === 'pendiente';
    const liquidacionLocked = hasFraccionado && anticipoPending;

    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('payment_status_collapsed') === 'true');
    const toggleCollapsed = () => {
      setCollapsed(prev => {
        localStorage.setItem('payment_status_collapsed', String(!prev));
        return !prev;
      });
    };

    return (
      <>
        <Card
          ref={ref}
          className={`transition-all ${highlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
        >
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={toggleCollapsed}>
            <CardTitle className="text-base flex items-center gap-2 w-full">
              <Banknote className="h-4 w-4 text-primary" />
              Estado de Pagos
              {collapsed && (
                <TooltipProvider>
                  <div className="flex items-center gap-2 ml-2" onClick={e => e.stopPropagation()}>
                    {isCobradoCompleto && !hasFraccionado ? (
                      <>
                        <StatusBadge estado="cobrado" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground">
                              <span className="text-xs">Cobrado:</span>{' '}
                              <span className="font-medium">{fmt(booking.cobro_importe || fee)}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Importe cobrado del booking.</TooltipContent>
                        </Tooltip>
                      </>
                    ) : hasFraccionado ? (
                      <>
                        <StatusBadge
                          estado={booking.anticipo_estado === 'cobrado' && booking.liquidacion_estado === 'cobrado' ? 'cobrado' : booking.anticipo_estado}
                          fechaEsperada={booking.anticipo_estado !== 'cobrado' ? booking.anticipo_fecha_esperada : booking.liquidacion_fecha_esperada}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground">
                              <span className="text-xs">Cobrado:</span>{' '}
                              <span className="font-medium">
                                {fmt((booking.anticipo_estado === 'cobrado' ? (booking.anticipo_importe || 0) : 0) + (booking.liquidacion_estado === 'cobrado' ? (booking.liquidacion_importe || 0) : 0))}
                              </span>
                              <span className="mx-1">de</span>
                              <span className="font-medium">{fmt(fee)}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Importe cobrado de la suma total del caché.</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <StatusBadge estado="pendiente" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground">
                              <span className="text-xs">Caché:</span>{' '}
                              <span className="font-medium">{fmt(fee)}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Caché total del booking. Aún no hay pagos registrados.</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </TooltipProvider>
              )}
              <ChevronDown className={`h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed && <CardContent className="space-y-4">
            {/* NO PAYMENTS */}
            {!hasPayments && !hasFraccionado && (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
                <Button onClick={() => setShowPago(true)} size="sm">
                  <Banknote className="h-4 w-4 mr-2" />
                  Registrar cobro
                </Button>
              </div>
            )}

            {/* PAGO ÚNICO COBRADO */}
            {isCobradoCompleto && !hasFraccionado && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pago único</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge estado="cobrado" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openEditDialog}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setShowRevertDialog('unico')}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Importe</p>
                    <p className="font-semibold">{fmt(booking.cobro_importe || fee)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha cobro</p>
                    <p className="font-medium">{fmtDate(booking.cobro_fecha)}</p>
                  </div>
                </div>
                {booking.cobro_referencia && (
                  <div>
                    <p className="text-xs text-muted-foreground">Referencia</p>
                    <p className="text-sm">{booking.cobro_referencia}</p>
                  </div>
                )}
              </div>
            )}

            {/* FRACCIONADO — VERTICAL TIMELINE */}
            {hasFraccionado && (
              <div className="space-y-0">
                {/* Timeline container */}
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

                  {/* ANTICIPO NODE */}
                  <div className="relative pb-5">
                    <div className={`absolute left-[-24px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      booking.anticipo_estado === 'cobrado' 
                        ? 'bg-primary border-primary' 
                        : 'bg-background border-muted-foreground/40'
                    }`}>
                      {booking.anticipo_estado === 'cobrado' && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          Anticipo ({booking.anticipo_porcentaje || 50}%) — Antes del evento
                        </span>
                        <div className="flex items-center gap-1">
                          <StatusBadge
                            estado={booking.anticipo_estado}
                            fechaEsperada={booking.anticipo_fecha_esperada}
                          />
                          {booking.anticipo_estado === 'cobrado' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openEditDialog}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setShowRevertDialog('anticipo')}>
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Importe</p>
                          <p className="font-semibold">{fmt(booking.anticipo_importe || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {booking.anticipo_estado === 'cobrado' ? 'Cobrado el' : 'Fecha esperada'}
                          </p>
                          <p className="font-medium">
                            {fmtDate(
                              booking.anticipo_estado === 'cobrado'
                                ? booking.anticipo_fecha_cobro
                                : booking.anticipo_fecha_esperada
                            )}
                          </p>
                        </div>
                      </div>
                      {booking.anticipo_estado !== 'cobrado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs mt-1"
                          onClick={() => setShowPago(true)}
                        >
                          Registrar anticipo
                        </Button>
                      )}
                      {booking.anticipo_estado === 'cobrado' && booking.anticipo_referencia && (
                        <div>
                          <p className="text-xs text-muted-foreground">Referencia</p>
                          <p className="text-xs">{booking.anticipo_referencia}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EVENT NODE */}
                  <div className="relative pb-5">
                    <div className="absolute left-[-24px] top-1 h-4 w-4 rounded-full border-2 bg-background border-primary/60 flex items-center justify-center">
                      <Music className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-xs font-medium text-muted-foreground">🎤 EVENTO</span>
                      <span className="text-xs text-muted-foreground">— {fmtDate(booking.fecha)}</span>
                    </div>
                  </div>

                  {/* LIQUIDACIÓN NODE */}
                  <div className="relative">
                    <div className={`absolute left-[-24px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      booking.liquidacion_estado === 'cobrado' 
                        ? 'bg-primary border-primary' 
                        : liquidacionLocked
                        ? 'bg-muted border-muted-foreground/20'
                        : 'bg-background border-muted-foreground/40'
                    }`}>
                      {booking.liquidacion_estado === 'cobrado' && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      {liquidacionLocked && <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />}
                    </div>
                    <div className={`rounded-lg border p-3 space-y-2 ${
                      liquidacionLocked ? 'border-muted/50 bg-muted/20 opacity-70' : 'border-border'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          Liquidación — Tras el evento
                        </span>
                        <div className="flex items-center gap-1">
                          <StatusBadge
                            estado={booking.liquidacion_estado}
                            fechaEsperada={booking.liquidacion_fecha_esperada}
                            locked={liquidacionLocked}
                          />
                          {booking.liquidacion_estado === 'cobrado' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openEditDialog}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setShowRevertDialog('liquidacion')}>
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Importe</p>
                          <p className="font-semibold">{fmt(booking.liquidacion_importe || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {booking.liquidacion_estado === 'cobrado' ? 'Cobrado el' : 'Fecha esperada'}
                          </p>
                          <p className="font-medium">
                            {fmtDate(
                              booking.liquidacion_estado === 'cobrado'
                                ? booking.liquidacion_fecha_cobro
                                : booking.liquidacion_fecha_esperada
                            )}
                          </p>
                        </div>
                      </div>
                      {liquidacionLocked && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                                <Lock className="h-3 w-3" />
                                En espera — registra el anticipo primero
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Disponible tras registrar el anticipo</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!liquidacionLocked && booking.liquidacion_estado !== 'cobrado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs mt-1"
                          onClick={() => setShowPago(true)}
                        >
                          Registrar liquidación
                        </Button>
                      )}
                      {booking.liquidacion_estado === 'cobrado' && booking.liquidacion_referencia && (
                        <div>
                          <p className="text-xs text-muted-foreground">Referencia</p>
                          <p className="text-xs">{booking.liquidacion_referencia}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SUMMARY BAR */}
                <Separator className="mt-4" />
                <div className="grid grid-cols-2 gap-3 text-xs pt-3">
                  <div>
                    <p className="text-muted-foreground">Fee bruto</p>
                    <p className="font-bold text-sm">{fmt(fee)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">IRPF estimado ({irpfPct}%)</p>
                    <p className="font-bold text-sm text-destructive">-{fmt(irpfTotal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fee neto</p>
                    <p className="font-bold text-sm">{fmt(feeNeto)}</p>
                  </div>
                  <div className="border-l pl-3 border-border">
                    <p className="text-muted-foreground">Cobrado</p>
                    <p className="font-bold text-sm text-primary">
                      {fmt(
                        (booking.anticipo_estado === 'cobrado' ? (booking.anticipo_importe || 0) : 0) +
                        (booking.liquidacion_estado === 'cobrado' ? (booking.liquidacion_importe || 0) : 0)
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 border-t pt-2 border-border">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Pendiente neto</p>
                      <p className="font-bold text-sm text-destructive">
                        {fmt(
                          feeNeto -
                          ((booking.anticipo_estado === 'cobrado' ? (booking.anticipo_importe || 0) : 0) +
                          (booking.liquidacion_estado === 'cobrado' ? (booking.liquidacion_importe || 0) : 0))
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>}
        </Card>

        <PagoDialog
          open={showPago}
          onOpenChange={(open) => {
            setShowPago(open);
            if (!open) setPagoEditMode(false);
          }}
          booking={booking}
          editMode={pagoEditMode}
          onSuccess={() => {
            setShowPago(false);
            setPagoEditMode(false);
            onUpdate();
          }}
        />

        <AlertDialog open={!!showRevertDialog} onOpenChange={(open) => !open && setShowRevertDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Revertir a pendiente
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-sm">
                <p>Esto marcará el cobro como <strong>no recibido</strong>.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Se actualizará el estado en la pestaña Finanzas &gt; Cobros.</li>
                  <li>Se eliminarán los registros de cobro asociados.</li>
                  <li>Si hay retenciones IRPF registradas en un trimestre fiscal ya presentado, podrían verse afectadas.</li>
                  {showRevertDialog === 'anticipo' && (
                    <li>La liquidación volverá a estado bloqueado (en espera del anticipo).</li>
                  )}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reverting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showRevertDialog && handleRevert(showRevertDialog)}
                disabled={reverting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {reverting ? 'Revirtiendo...' : 'Confirmar reversión'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);

PaymentStatusCard.displayName = 'PaymentStatusCard';
