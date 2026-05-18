import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DependentTask {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  depth: number;
  currentStartDate: Date | null;
  currentEndDate: Date | null;
  newStartDate: Date | null;
  newEndDate: Date | null;
  isConflict: boolean; // true if this task actually needs to move
}

interface AnchorDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  daysDelta: number;
  dependentTasks: DependentTask[];
  onConfirm: (selectedTaskIds: string[]) => void;
  releaseDate?: Date | null;
}

const formatShort = (d: Date | null) =>
  d ? format(d, 'dd MMM', { locale: es }) : '—';

export default function AnchorDependencyDialog({
  open,
  onOpenChange,
  sourceName,
  daysDelta,
  dependentTasks,
  onConfirm,
  releaseDate,
}: AnchorDependencyDialogProps) {
  const direction = daysDelta > 0 ? 'adelante' : 'atrás';
  const isPostpone = daysDelta > 0;
  const absDays = Math.abs(daysDelta);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      // By default select all tasks that have a real conflict
      setSelectedTasks(new Set(dependentTasks.filter(t => t.isConflict).map(t => t.id)));
    }
  }, [open, dependentTasks]);

  const conflictTasks = dependentTasks.filter(t => t.isConflict);
  const safeTasksCount = dependentTasks.length - conflictTasks.length;

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTasks.size === conflictTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(conflictTasks.map(t => t.id)));
    }
  };

  const isCloseToRelease = (date: Date | null) => {
    if (!date || !releaseDate) return false;
    const diff = Math.ceil((releaseDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isPostpone ? (
              <ArrowRight className="w-5 h-5 text-warning" />
            ) : (
              <ArrowLeft className="w-5 h-5 text-blue-500" />
            )}
            Tareas ancladas detectadas
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Has movido <strong>"{sourceName}"</strong>{' '}
                <Badge variant={isPostpone ? 'warning' : 'accent'} className="mx-1">
                  {absDays} día{absDays > 1 ? 's' : ''} hacia {direction}
                </Badge>
              </p>

              {isPostpone && conflictTasks.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span>Posponer estas tareas puede afectar los plazos de entrega.</span>
                </div>
              )}

              {!isPostpone && safeTasksCount > 0 && conflictTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Las tareas dependientes no se ven afectadas (no hay solapamiento).
                </p>
              )}

              {conflictTasks.length > 0 && (
                <>
                  <p className="text-sm">Selecciona las tareas que deseas mover:</p>
                  <div className="space-y-1 py-1 max-h-[300px] overflow-y-auto">
                    <div
                      className="flex items-center space-x-2 pb-2 border-b cursor-pointer"
                      onClick={toggleAll}
                    >
                      <Checkbox
                        id="select-all"
                        checked={selectedTasks.size === conflictTasks.length && conflictTasks.length > 0}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Seleccionar todas ({conflictTasks.length})
                      </label>
                    </div>
                    {dependentTasks.map(task => {
                      if (!task.isConflict) return null;
                      const riskNew = isCloseToRelease(task.newEndDate);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 cursor-pointer py-1.5"
                          style={{ paddingLeft: `${(task.depth - 1) * 20 + 4}px` }}
                          onClick={() => toggleTask(task.id)}
                        >
                          {task.depth > 1 && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <Checkbox
                            id={task.id}
                            checked={selectedTasks.has(task.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={task.id} className="text-sm cursor-pointer flex items-center gap-1.5">
                              <strong className="truncate">{task.name}</strong>
                              {riskNew && (
                                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                              )}
                            </label>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span className="line-through">
                                {formatShort(task.currentStartDate)} – {formatShort(task.currentEndDate)}
                              </span>
                              <ArrowRight className="w-3 h-3" />
                              <span className={riskNew ? 'text-destructive font-medium' : ''}>
                                {formatShort(task.newStartDate)} – {formatShort(task.newEndDate)}
                              </span>
                              <span className="text-muted-foreground/60">({task.workflowName})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {safeTasksCount > 0 && conflictTasks.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {safeTasksCount} tarea{safeTasksCount > 1 ? 's' : ''} dependiente{safeTasksCount > 1 ? 's' : ''} no se ve{safeTasksCount > 1 ? 'n' : ''} afectada{safeTasksCount > 1 ? 's' : ''}.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm([])}>
            No mover ninguna
          </AlertDialogCancel>
          {conflictTasks.length > 0 && (
            <AlertDialogAction onClick={() => onConfirm(Array.from(selectedTasks))}>
              Mover seleccionadas ({selectedTasks.size})
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
