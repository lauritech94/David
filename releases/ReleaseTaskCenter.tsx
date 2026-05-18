import { useState, useEffect } from 'react';
import { useReleaseHealthCheck, type ReleaseAlert } from '@/hooks/useReleaseHealthCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, X, ClipboardList } from 'lucide-react';

const SECTION_LABELS: Record<string, string> = {
  creditos: 'Créditos',
  audio: 'Audio',
  cronograma: 'Cronograma',
  presupuestos: 'Presupuestos',
  'imagen-video': 'Imagen & Video',
  epf: 'EPF',
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  urgent: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    icon: 'text-destructive',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
  },
};

interface Props {
  releaseId: string;
  onNavigate: (sectionId: string, alertId?: string) => void;
}

export default function ReleaseTaskCenter({ releaseId, onNavigate }: Props) {
  const alerts = useReleaseHealthCheck(releaseId);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(`release-dismissed-${releaseId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    sessionStorage.setItem(`release-dismissed-${releaseId}`, JSON.stringify([...dismissed]));
  }, [dismissed, releaseId]);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  const handleDismiss = (alertId: string) => {
    setDismissed(prev => new Set([...prev, alertId]));
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Centro de Tareas</CardTitle>
            {visibleAlerts.length > 0 ? (
              <Badge variant="secondary" className="ml-1">{visibleAlerts.length}</Badge>
            ) : null}
          </div>
          {visibleAlerts.length === 0 && (
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Todo al día
            </Badge>
          )}
        </div>
      </CardHeader>

      {visibleAlerts.length > 0 && (
        <CardContent className="pt-0 space-y-2">
          {visibleAlerts.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity];
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${styles.bg} ${styles.border}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />
                <span className="text-sm flex-1">{alert.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => onNavigate(alert.section, alert.id)}
                >
                  Ir a {SECTION_LABELS[alert.section] || alert.section}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
                {alert.dismissible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleDismiss(alert.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
