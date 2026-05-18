import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, XCircle, CheckCircle, Paperclip } from 'lucide-react';
import { ValidationError, ValidationWarning } from '@/lib/bookingValidations';

interface AlertsBadgeProps {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  onAttachDocuments?: () => void;
  showAttachButton?: boolean;
}

export function AlertsBadge({ errors, warnings, onAttachDocuments, showAttachButton }: AlertsBadgeProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <Badge variant="outline" className="badge-success">
        <CheckCircle className="w-3 h-3 mr-1" />
        OK
      </Badge>
    );
  }

  const hasBlocking = errors.length > 0;
  const hasRedWarnings = warnings.some(w => w.severity === 'red');
  
  let badgeClass = '';
  let icon = null;
  let summary = '';
  let dialogTitle = '';

  if (hasBlocking) {
    badgeClass = 'badge-error';
    icon = <XCircle className="w-3 h-3 mr-1" />;
    summary = `${errors.length} Error${errors.length > 1 ? 'es' : ''}`;
    dialogTitle = `Errores de validación (${errors.length})`;
  } else if (hasRedWarnings) {
    badgeClass = 'badge-error';
    icon = <AlertTriangle className="w-3 h-3 mr-1" />;
    summary = `${warnings.length} Alerta${warnings.length > 1 ? 's' : ''}`;
    dialogTitle = `Alertas (${warnings.length})`;
  } else {
    badgeClass = 'badge-warning';
    icon = <AlertTriangle className="w-3 h-3 mr-1" />;
    summary = `${warnings.length} Aviso${warnings.length > 1 ? 's' : ''}`;
    dialogTitle = `Avisos (${warnings.length})`;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge variant="outline" className={`${badgeClass} cursor-pointer hover:opacity-80`}>
          {icon}
          {summary}
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {errors.map((error, index) => (
            <div key={`error-${index}`} className="flex items-start gap-3 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
              <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-destructive" />
              <div className="flex-1">
                <div className="font-medium text-destructive mb-1">Error de validación</div>
                <div className="text-sm text-muted-foreground">{error.message}</div>
              </div>
            </div>
          ))}
          {warnings.map((warning, index) => (
            <div key={`warning-${index}`} className={`flex items-start gap-3 p-3 border rounded-lg ${
              warning.severity === 'red' 
                ? 'border-destructive/20 bg-destructive/5' 
                : 'border-warning/20 bg-warning/5'
            }`}>
              <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                warning.severity === 'red' ? 'text-destructive' : 'text-warning'
              }`} />
              <div className="flex-1">
                <div className={`font-medium mb-1 ${
                  warning.severity === 'red' ? 'text-destructive' : 'text-warning'
                }`}>
                  {warning.severity === 'red' ? 'Alerta' : 'Aviso'}
                </div>
                <div className="text-sm text-muted-foreground">{warning.message}</div>
              </div>
            </div>
          ))}
          
          {showAttachButton && onAttachDocuments && (
            <div className="pt-4 border-t">
              <Button 
                type="button"
                variant="outline" 
                onClick={onAttachDocuments}
                className="w-full"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Adjuntar documentos
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}