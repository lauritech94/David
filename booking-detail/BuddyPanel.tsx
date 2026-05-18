import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Check, ChevronRight, Handshake } from 'lucide-react';
import { type BuddyAlert, type BuddyAction, type PipelineSummary } from '@/hooks/useBookingBuddy';

interface BuddyPanelProps {
  open: boolean;
  onClose: () => void;
  urgentAlerts: BuddyAlert[];
  upcomingActions: BuddyAction[];
  pipelineSummary: PipelineSummary;
  onDismissAlert: (key: string) => void;
  onMarkDone: (checkpointId: string) => void;
  onOpenPago: (bookingId: string) => void;
}

const fmt = (v: number) => `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function BuddyPanel({
  open, onClose, urgentAlerts, upcomingActions, pipelineSummary,
  onDismissAlert, onMarkDone, onOpenPago,
}: BuddyPanelProps) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Booking Buddy</h3>
            <p className="text-xs text-muted-foreground">Tu asistente de pipeline</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* SECTION A: Atención Inmediata */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🔴</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Atención Inmediata</h4>
              {urgentAlerts.length > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">{urgentAlerts.length}</Badge>
              )}
            </div>
            {urgentAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Todo al día 🎉</p>
            ) : (
              <div className="space-y-2">
                {urgentAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-2.5 text-xs space-y-1.5 ${
                      alert.type === 'urgent'
                        ? 'border-destructive/30 bg-destructive/5'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-foreground leading-snug">
                        <span className="mr-1">{alert.icon}</span>
                        {alert.message}
                      </p>
                      <button
                        onClick={() => onDismissAlert(alert.key)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      {alert.actions.map((a, i) => (
                        <Button
                          key={i}
                          variant={i === 0 ? 'default' : 'outline'}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            if (a.action === 'cobro') onOpenPago(alert.bookingId);
                            else navigate(`/booking/${alert.bookingId}`);
                          }}
                        >
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* SECTION B: Próximas Acciones */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🟡</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Próximas Acciones</h4>
              {upcomingActions.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{upcomingActions.length}</Badge>
              )}
            </div>
            {upcomingActions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sin acciones pendientes</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingActions.map(action => (
                  <div
                    key={action.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-xs group hover:bg-muted/30 transition-colors"
                  >
                    <span>{action.icon}</span>
                    <p className="flex-1 text-foreground leading-snug">{action.message}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {action.checkpointId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onMarkDone(action.checkpointId!)}
                          title="Marcar hecho"
                        >
                          <Check className="h-3 w-3 text-primary" />
                        </Button>
                      )}
                      {action.bookingId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => navigate(`/booking/${action.bookingId}`)}
                          title="Ver evento"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* SECTION C: Resumen del Pipeline */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">📊</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Resumen del Pipeline</h4>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-xs">
              <p className="font-semibold text-foreground mb-1">Pipeline Health</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-primary">🟢</span>
                  <span>{pipelineSummary.confirmados} eventos confirmados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🟡</span>
                  <span>{pipelineSummary.negociacionActiva} en negociación activa</span>
                </div>
                {pipelineSummary.cobrosVencidos > 0 && (
                  <div className="flex items-center gap-2">
                    <span>🔴</span>
                    <span className="text-destructive font-medium">{pipelineSummary.cobrosVencidos} cobros vencidos</span>
                  </div>
                )}
                {pipelineSummary.ofertasFrias > 0 && (
                  <div className="flex items-center gap-2">
                    <span>⚪</span>
                    <span>{pipelineSummary.ofertasFrias} ofertas frías (&gt;21d sin actividad)</span>
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              <p className="font-semibold text-foreground">Ingresos esperados (próx. 90 días)</p>
              <p className="text-foreground">
                {fmt(pipelineSummary.ingresosEsperados90d)} bruto · {fmt(pipelineSummary.ingresosNetos90d)} neto
              </p>

              {(pipelineSummary.anticiposPendientes > 0 || pipelineSummary.liquidacionesPendientes > 0) && (
                <>
                  <Separator className="my-2" />
                  <p className="font-semibold text-foreground">Cobros Pendientes</p>
                  <p className="text-foreground">
                    {fmt(pipelineSummary.anticiposPendientes)} anticipo · {fmt(pipelineSummary.liquidacionesPendientes)} liquidación
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
