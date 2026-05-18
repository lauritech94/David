import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import type { AlertData } from '@/hooks/useAnalyticsData';
import { formatCurrency } from './analyticsUtils';

interface Props {
  alerts: AlertData;
}

export function AnalyticsAlerts({ alerts }: Props) {
  const hasAlerts = alerts.overduePayments.length > 0 || alerts.lowConversion || alerts.inactivityRisk;
  if (!hasAlerts) return null;

  return (
    <div className="space-y-2">
      {alerts.overduePayments.length > 0 && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cobros vencidos</AlertTitle>
          <AlertDescription>
            {alerts.overduePayments.length} evento(s) con pagos pendientes hace más de 7 días:
            {' '}{alerts.overduePayments.map(p => `${p.name} (${formatCurrency(p.amount)}, ${p.days}d)`).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {alerts.lowConversion && (
        <Alert className="border-warning/30 bg-warning/5">
          <TrendingDown className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Conversión en descenso</AlertTitle>
          <AlertDescription>
            La tasa de conversión de ofertas ha bajado un {Math.abs(alerts.conversionDrop).toFixed(0)}% respecto al período anterior.
          </AlertDescription>
        </Alert>
      )}

      {alerts.inactivityRisk && (
        <Alert className="border-warning/30 bg-warning/5">
          <Clock className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Riesgo de inactividad</AlertTitle>
          <AlertDescription>
            {alerts.daysUntilNext === null
              ? 'No hay eventos confirmados en el futuro. Revisa tu pipeline de booking.'
              : `El próximo evento confirmado es en ${alerts.daysUntilNext} días. Considera buscar más oportunidades.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
