import { useState } from 'react';
import { X, Link2, Plus, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface TaskOption {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
}

interface MultiAnchorSelectorProps {
  value: string[];
  onChange: (anchors: string[]) => void;
  availableTasks: TaskOption[];
  currentTaskId: string;
  getTaskName: (taskId: string) => string;
  compact?: boolean;
}

export default function MultiAnchorSelector({
  value,
  onChange,
  availableTasks,
  currentTaskId,
  getTaskName,
  compact = false,
}: MultiAnchorSelectorProps) {
  const [open, setOpen] = useState(false);

  // Filter out current task and already selected tasks
  const selectableTasks = availableTasks.filter(
    t => t.id !== currentTaskId && !value.includes(t.id)
  );

  const addAnchor = (taskId: string) => {
    onChange([...value, taskId]);
  };

  const removeAnchor = (taskId: string) => {
    onChange(value.filter(id => id !== taskId));
  };

  const hasAnchors = value.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2 justify-start text-left font-normal text-xs gap-1',
                !hasAnchors && 'text-muted-foreground'
              )}
            >
              {hasAnchors ? (
                <>
                  <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-primary font-medium">{value.length}</span>
                </>
              ) : (
                <span>—</span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {hasAnchors && (
          <TooltipContent side="top" className="max-w-[220px]">
            <p className="text-xs font-medium mb-0.5">Anclada a:</p>
            {value.map(id => (
              <p key={id} className="text-xs truncate">• {getTaskName(id) || id}</p>
            ))}
          </TooltipContent>
        )}
      </Tooltip>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              Tareas ancladas
            </h4>
            {hasAnchors && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => onChange([])}
              >
                Quitar todas
              </Button>
            )}
          </div>

          {/* Current anchors */}
          {hasAnchors ? (
            <div className="flex flex-wrap gap-1.5">
              {value.map(anchorId => {
                const name = getTaskName(anchorId);
                return (
                  <Badge
                    key={anchorId}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-1 text-xs"
                  >
                    <span className="truncate max-w-[140px]">{name || anchorId}</span>
                    <button
                      onClick={() => removeAnchor(anchorId)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sin dependencias. La fecha se establecerá manualmente.
            </p>
          )}

          {/* Add anchor selector */}
          {selectableTasks.length > 0 && (
            <>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Añadir dependencia:</p>
                <Command className="border rounded-lg">
                  <CommandInput placeholder="Buscar tarea..." className="h-8" />
                  <CommandList className="max-h-[150px]">
                    <CommandEmpty>No hay tareas disponibles</CommandEmpty>
                    {/* Group by workflow */}
                    {Object.entries(
                      selectableTasks.reduce<Record<string, TaskOption[]>>((acc, task) => {
                        if (!acc[task.workflowName]) acc[task.workflowName] = [];
                        acc[task.workflowName].push(task);
                        return acc;
                      }, {})
                    ).map(([workflowName, tasks]) => (
                      <CommandGroup key={workflowName} heading={workflowName}>
                        {tasks.map(task => (
                          <CommandItem
                            key={task.id}
                            value={`${task.name} ${workflowName}`}
                            onSelect={() => {
                              addAnchor(task.id);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3 mr-2" />
                            {task.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </div>
            </>
          )}

          {selectableTasks.length === 0 && hasAnchors && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              No hay más tareas disponibles para anclar.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
