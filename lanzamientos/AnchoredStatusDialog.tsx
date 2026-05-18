import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface DependentTaskInfo {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  currentStatus: TaskStatus;
}

interface AnchoredStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  newStatus: TaskStatus;
  dependentTasks: DependentTaskInfo[];
  onConfirm: (decisions: Record<string, TaskStatus | 'keep'>) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  completado: 'Completado',
  retrasado: 'Retrasado',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendiente: 'bg-muted text-muted-foreground',
  en_proceso: 'bg-blue-500/20 text-blue-600',
  completado: 'bg-green-500/20 text-green-600',
  retrasado: 'bg-red-500/20 text-red-600',
};

export default function AnchoredStatusDialog({
  open,
  onOpenChange,
  sourceName,
  dependentTasks,
  onConfirm,
}: AnchoredStatusDialogProps) {
  // decisions: taskId -> 'retrasado' | 'keep' | 'pendiente'
  const [decisions, setDecisions] = useState<Record<string, TaskStatus | 'keep'>>({});

  useEffect(() => {
    if (open) {
      // Default: mark all as retrasado
      const initial: Record<string, TaskStatus | 'keep'> = {};
      dependentTasks.forEach(t => {
        initial[t.id] = 'retrasado';
      });
      setDecisions(initial);
    }
  }, [open, dependentTasks]);

  const handleConfirm = () => {
    onConfirm(decisions);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Tareas ancladas afectadas
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 pt-1">
              <p>
                <strong>"{sourceName}"</strong> se ha marcado como{' '}
                <Badge className="bg-red-500/20 text-red-600 font-normal text-xs">Retrasada</Badge>.
              </p>
              <p className="text-sm text-muted-foreground">
                Las siguientes tareas están ancladas a ella. ¿Qué deseas hacer con cada una?
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {dependentTasks.map(task => (
            <div
              key={task.id}
              className="rounded-lg border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{task.name}</p>
                  <p className="text-xs text-muted-foreground">{task.workflowName}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <Badge
                    className={cn(
                      'font-normal text-xs px-2 py-0.5',
                      STATUS_COLORS[task.currentStatus]
                    )}
                  >
                    {STATUS_LABELS[task.currentStatus]}
                  </Badge>
                </div>
              </div>

              <RadioGroup
                value={decisions[task.id] ?? 'retrasado'}
                onValueChange={(val) =>
                  setDecisions(prev => ({ ...prev, [task.id]: val as TaskStatus | 'keep' }))
                }
                className="gap-1"
              >
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer">
                  <RadioGroupItem value="retrasado" id={`${task.id}-retrasado`} />
                  <Label
                    htmlFor={`${task.id}-retrasado`}
                    className="cursor-pointer text-sm flex items-center gap-1.5"
                  >
                    Marcar como{' '}
                    <Badge className="bg-red-500/20 text-red-600 font-normal text-xs">Retrasada</Badge>
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer">
                  <RadioGroupItem value="keep" id={`${task.id}-keep`} />
                  <Label
                    htmlFor={`${task.id}-keep`}
                    className="cursor-pointer text-sm flex items-center gap-1.5"
                  >
                    Mantener estado actual{' '}
                    <Badge
                      className={cn('font-normal text-xs', STATUS_COLORS[task.currentStatus])}
                    >
                      {STATUS_LABELS[task.currentStatus]}
                    </Badge>
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer">
                  <RadioGroupItem value="pendiente" id={`${task.id}-pendiente`} />
                  <Label
                    htmlFor={`${task.id}-pendiente`}
                    className="cursor-pointer text-sm flex items-center gap-1.5"
                  >
                    Marcar como{' '}
                    <Badge className="bg-muted text-muted-foreground font-normal text-xs">Pendiente</Badge>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Aplicar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
