import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronRight,
  Bell,
  BellOff,
  Check,
  Circle,
  CheckCircle2,
  ExternalLink,
  Phone,
  Mail,
} from 'lucide-react';
import { type EventAssistantData, type EventAlert, type ChecklistItem, type FinancialSummary } from '@/hooks/useEventAssistant';
import { toast } from '@/hooks/use-toast';

const fmt = (v: number) => `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0 })}`;

interface EventAssistantCardProps {
  data: EventAssistantData;
  bookingId: string;
  onEdit: () => void;
  onOpenPago: () => void;
}

export function EventAssistantCard({ data, bookingId, onEdit, onOpenPago }: EventAssistantCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const {
    phase, daysUntilEvent, alerts, actions, checklist, checklistProgress,
    financialSummary, promotorContact, notificationsEnabled, setNotificationsEnabled,
    markCheckpointDone, loading,
  } = data;

  if (loading) return null;

  const handleAction = (action: string) => {
    switch (action) {
      case 'edit':
        onEdit();
        break;
      case 'scroll_viability':
        document.querySelector('[data-viability-card]')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'scroll_pagos':
        navigate(`/booking/${bookingId}?section=pagos`);
        break;
      case 'tab_files':
        // Click the files tab
        const filesTab = document.querySelector('[value="files"]') as HTMLElement;
        filesTab?.click();
        break;
      case 'tab_roadmap':
        const roadmapTab = document.querySelector('[value="roadmap"]') as HTMLElement;
        roadmapTab?.click();
        break;
      case 'tab_expenses':
        const expensesTab = document.querySelector('[value="expenses"]') as HTMLElement;
        expensesTab?.click();
        break;
      case 'open_pago':
        onOpenPago();
        break;
      case 'contact_promotor':
        if (promotorContact?.phone) {
          window.open(`tel:${promotorContact.phone}`, '_self');
        } else if (promotorContact?.email) {
          window.open(`mailto:${promotorContact.email}`, '_self');
        } else {
          onEdit();
        }
        break;
      case 'tab_files_drive':
        navigate(`/booking/${bookingId}`);
        const driveTab = document.querySelector('[value="files"]') as HTMLElement;
        driveTab?.click();
        break;
      default:
        if (action.startsWith('mark_')) {
          const type = action.replace('mark_', '').replace('_done', '');
          markCheckpointDone(type).then(() => {
            toast({ title: 'Hecho', description: 'Marcado como completado.' });
          });
        }
        break;
    }
  };

  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 3);
  const hiddenCount = alerts.length - 3;

  const phaseTitle = getPhaseTitle(phase, daysUntilEvent);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                🤝 Asistente del evento
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {alerts.length > 0 && !isExpanded && (
                  <Badge variant="destructive" className="text-xs px-1.5 h-5">
                    {alerts.length}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationsEnabled(!notificationsEnabled);
                    toast({
                      title: notificationsEnabled ? 'Notificaciones desactivadas' : 'Notificaciones activadas',
                      description: notificationsEnabled
                        ? 'Ya no recibirás alertas para este evento.'
                        : 'Recibirás alertas cuando haya acciones pendientes.',
                    });
                  }}
                >
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Phase-specific content */}
            {phase === 'facturado' && (
              <CompletionSummary financialSummary={financialSummary} data={data} bookingId={bookingId} />
            )}

            {(phase === 'cancelado' || phase === 'cerrado' || phase === 'descartado') && (
              <CancelledSummary data={data} />
            )}

            {/* Confirmado 0-7 days: show only checklist */}
            {phase === 'confirmado' && daysUntilEvent !== null && daysUntilEvent <= 7 && (
              <>
                <div className="text-center py-2">
                  <p className="font-bold text-foreground">
                    ⚡ El evento es en {daysUntilEvent <= 0 ? 'hoy' : `${daysUntilEvent} días`}
                  </p>
                </div>
                {promotorContact && (
                  <PromoterContact contact={promotorContact} />
                )}
                <EventChecklist
                  items={checklist}
                  progress={checklistProgress}
                  urgent={daysUntilEvent <= 7}
                  onAction={handleAction}
                />
              </>
            )}

            {/* Normal phase rendering (not 0-7 day confirmado, not facturado/cancelled) */}
            {!['facturado', 'cancelado', 'cerrado', 'descartado'].includes(phase) &&
              !(phase === 'confirmado' && daysUntilEvent !== null && daysUntilEvent <= 7) && (
              <>
                {/* Alerts section */}
                {visibleAlerts.length > 0 ? (
                  <section>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                      🔴 Requiere atención
                    </p>
                    <div className="space-y-2">
                      {visibleAlerts.map(alert => (
                        <AlertItem key={alert.id} alert={alert} onAction={handleAction} />
                      ))}
                      {hiddenCount > 0 && !showAllAlerts && (
                        <button
                          onClick={() => setShowAllAlerts(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver {hiddenCount} más →
                        </button>
                      )}
                    </div>
                  </section>
                ) : (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                      ✓ Todo en orden
                    </span>
                  </div>
                )}

                {/* Checklist for 7-30 days */}
                {checklist.length > 0 && (
                  <>
                    <Separator />
                    <EventChecklist
                      items={checklist}
                      progress={checklistProgress}
                      urgent={daysUntilEvent !== null && daysUntilEvent <= 14}
                      onAction={handleAction}
                    />
                  </>
                )}

                {/* Actions section */}
                {actions.length > 0 && (
                  <>
                    <Separator />
                    <section>
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                        🟡 Próximas acciones
                      </p>
                      <div className="space-y-1.5">
                        {actions.map(action => (
                          <div
                            key={action.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                          >
                            <span>{action.icon}</span>
                            <span className="flex-1">{action.message}</span>
                            {action.daysUntilDue !== undefined && action.daysUntilDue > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                                {action.daysUntilDue}d
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {/* Financial summary for realizado */}
                {financialSummary && phase === 'realizado' && (
                  <>
                    <Separator />
                    <FinancialSection summary={financialSummary} />
                  </>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function getPhaseTitle(phase: string, daysUntil: number | null): string {
  if (phase === 'negociacion') return 'Negociación';
  if (phase === 'confirmado') {
    if (daysUntil !== null && daysUntil <= 7) return 'Evento inminente';
    if (daysUntil !== null && daysUntil <= 30) return 'Pre-evento';
    return 'Confirmado';
  }
  if (phase === 'realizado') return 'Post-evento';
  if (phase === 'facturado') return 'Completado';
  return phase;
}

function AlertItem({ alert, onAction }: { alert: EventAlert; onAction: (a: string) => void }) {
  return (
    <div className={`rounded-lg border p-2.5 text-xs space-y-1.5 ${
      alert.severity === 'critical'
        ? 'border-destructive/30 bg-destructive/5'
        : alert.severity === 'warning'
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-muted/20'
    }`}>
      <p className="text-foreground leading-snug">
        <span className="mr-1">{alert.icon}</span>
        {alert.message}
      </p>
      {alert.subtext && (
        <p className="text-muted-foreground text-[11px]">{alert.subtext}</p>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {alert.actions.map((a, i) => (
          <Button
            key={i}
            variant={i === 0 ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => onAction(a.action)}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function EventChecklist({
  items, progress, urgent, onAction,
}: {
  items: ChecklistItem[];
  progress: { done: number; total: number };
  urgent: boolean;
  onAction: (a: string) => void;
}) {
  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
  const isLow = urgent && progress.done < Math.ceil(progress.total * 0.75);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">
          ¿Listo para el evento?
        </p>
        <span className={`text-xs font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
          {progress.done}/{progress.total} listos
        </span>
      </div>
      <Progress value={pct} className={`h-1.5 mb-3 ${isLow ? '[&>div]:bg-destructive' : ''}`} />
      <div className="space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-2 text-xs py-1 px-2 rounded-md ${
              !item.checked && urgent ? 'bg-destructive/5 text-destructive' : ''
            }`}
          >
            {item.checked ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={`flex-1 ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.label}
            </span>
            {!item.checked && item.action && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5 text-primary"
                onClick={() => onAction(item.action!)}
              >
                Resolver
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FinancialSection({ summary }: { summary: FinancialSummary }) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
        💰 Resumen financiero
      </p>
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1 font-mono">
        <div className="flex justify-between">
          <span>Fee acordado:</span>
          <span className="font-semibold">{fmt(summary.fee)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>IRPF retenido ({summary.irpfPorcentaje}%):</span>
          <span>-{fmt(summary.irpfAmount)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Fee neto:</span>
          <span>{fmt(summary.feeNeto)}</span>
        </div>
        <Separator className="my-1.5" />
        <div className="flex justify-between">
          <span>Comisión ({summary.comisionPorcentaje}%):</span>
          <span className="font-semibold">{fmt(summary.comisionAmount)}</span>
        </div>
        <Separator className="my-1.5" />
        <div className="flex justify-between">
          <span>Anticipo:</span>
          <span>
            {fmt(summary.anticipoImporte)}{' '}
            {summary.anticipoEstado === 'cobrado' ? '✓' : '⏳'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Liquidación:</span>
          <span>
            {fmt(summary.liquidacionImporte)}{' '}
            {summary.liquidacionEstado === 'cobrado' ? '✓' : '⏳'}
          </span>
        </div>
      </div>
    </section>
  );
}

function CompletionSummary({ financialSummary, data, bookingId }: {
  financialSummary: FinancialSummary | null;
  data: EventAssistantData;
  bookingId: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="text-center py-2">
        <p className="text-lg font-bold text-green-600">✅ Evento completado</p>
      </div>

      {financialSummary && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1 font-mono">
          <p className="font-semibold text-foreground mb-1 font-sans">Resumen final</p>
          <div className="flex justify-between">
            <span>Fee neto cobrado:</span>
            <span className="font-semibold">{fmt(financialSummary.feeNeto)}</span>
          </div>
          <div className="flex justify-between">
            <span>Comisión empresa:</span>
            <span>{fmt(financialSummary.comisionAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>IRPF a Hacienda:</span>
            <span>{fmt(financialSummary.irpfAmount)}</span>
          </div>
          {financialSummary.liquidacionEstado === 'cobrado' && (
            <div className="flex justify-between text-muted-foreground">
              <span>Fecha liquidación:</span>
              <span>Cobrado</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground mb-1">Documentos</p>
        <div className="flex items-center gap-1.5">
          {data.hasSignedContract ? (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
          <span>Contrato archivado</span>
        </div>
        <div className="flex items-center gap-1.5">
          {financialSummary?.anticipoEstado === 'cobrado' ? (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
          <span>Factura anticipo</span>
        </div>
        <div className="flex items-center gap-1.5">
          {financialSummary?.liquidacionEstado === 'cobrado' ? (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
          <span>Factura liquidación</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => navigate('/finanzas')}
      >
        Ver en Finanzas →
      </Button>
    </div>
  );
}

function CancelledSummary({ data }: { data: EventAssistantData }) {
  return (
    <div className="space-y-3">
      <div className="text-center py-2">
        <p className="text-sm text-muted-foreground">
          Este evento fue {data.phase === 'descartado' ? 'descartado' : 'cancelado/cerrado'}.
        </p>
      </div>
      {data.financialSummary && data.financialSummary.fee > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
          <p className="text-foreground">Fee registrado: {fmt(data.financialSummary.fee)}</p>
          <p className="text-muted-foreground mt-1">
            ¿Hay penalización por cancelación?
          </p>
        </div>
      )}
    </div>
  );
}

function PromoterContact({ contact }: { contact: { name?: string; phone?: string; email?: string } }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1">📞 Promotor</p>
      {contact.name && <p className="text-foreground">{contact.name}</p>}
      <div className="flex gap-2 mt-1">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            <Phone className="h-3 w-3" />
            {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            <Mail className="h-3 w-3" />
            {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}
