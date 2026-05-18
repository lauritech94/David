import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, addDays, differenceInDays, startOfDay, startOfMonth, subMonths, min, max, eachDayOfInterval, isAfter, isBefore, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, EyeOff, CircleDot, User, Link2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface Subtask {
  id: string;
  name: string;
  type: 'full' | 'checkbox' | 'note' | 'comment';
  startDate?: Date | null;
  estimatedDays?: number;
  status?: TaskStatus;
  anchoredTo?: string[];
}

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string[];
  customStartDate?: boolean;
  subtasks?: Subtask[];
}

interface WorkflowSection {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  tasks: ReleaseTask[];
}

interface GanttChartProps {
  workflows: WorkflowSection[];
  onUpdateTaskDate?: (workflowId: string, taskId: string, newStartDate: Date, newEstimatedDays: number, subtaskId?: string) => void;
  onSetAnchor?: (workflowId: string, taskId: string, anchoredTo: string[] | undefined) => void;
  onUpdateTaskStatus?: (workflowId: string, taskId: string, status: TaskStatus) => void;
  onOpenResponsible?: (workflowId: string, taskId: string) => void;
  onOpenAnchor?: (workflowId: string, taskId: string) => void;
  getTaskName?: (taskId: string) => string;
  selectedTaskIds?: Set<string>;
  onTaskSelect?: (taskId: string) => void;
  onHideTask?: (taskId: string) => void;
  onClearSelection?: () => void;
  fitToView?: boolean;
  onShiftWorkflow?: (workflowId: string, daysDelta: number) => void;
}

const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  pendiente: 'bg-muted-foreground/50',
  en_proceso: 'bg-blue-500',
  completado: 'bg-green-500',
  retrasado: 'bg-red-500',
};

const WORKFLOW_COLORS: Record<string, string> = {
  audio: 'border-l-blue-500',
  visual: 'border-l-pink-500',
  fabricacion: 'border-l-yellow-500',
  contenido: 'border-l-purple-500',
  marketing: 'border-l-orange-500',
  directo: 'border-l-green-500',
};

const WORKFLOW_BAR_COLORS: Record<string, { bg: string; fill: string }> = {
  audio: { bg: 'bg-blue-500/20', fill: 'bg-blue-500/60' },
  visual: { bg: 'bg-pink-500/20', fill: 'bg-pink-500/60' },
  fabricacion: { bg: 'bg-yellow-500/20', fill: 'bg-yellow-500/60' },
  contenido: { bg: 'bg-purple-500/20', fill: 'bg-purple-500/60' },
  marketing: { bg: 'bg-orange-500/20', fill: 'bg-orange-500/60' },
  directo: { bg: 'bg-green-500/20', fill: 'bg-green-500/60' },
};

interface DragState {
  taskId: string;
  workflowId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  origStartDate: Date;
  origDays: number;
  containerWidth: number;
  activated: boolean;
  isSubtask: boolean;
}

interface DragPreview {
  taskId: string;
  startDate: Date;
  days: number;
}

interface WorkflowDragState {
  workflowId: string;
  startX: number;
  containerWidth: number;
  activated: boolean;
}

interface PendingWorkflowShift {
  workflowId: string;
  workflowName: string;
  daysDelta: number;
  tasksWithWarning: { id: string; name: string }[];
}

// Dependency lines overlay using DOM measurement
function DependencyLinesOverlay({
  lines,
  containerRef,
  workflows,
  tasksWithDates,
  collapsedWorkflows,
  fitToView,
}: {
  lines: { fromLeftPct: number; fromWidthPct: number; fromRow: number; toLeftPct: number; toRow: number; toWorkflowId: string; fromWorkflowId: string }[];
  containerRef: React.RefObject<HTMLDivElement>;
  workflows: WorkflowSection[];
  tasksWithDates: any[];
  collapsedWorkflows: Set<string>;
  fitToView: boolean;
}) {
  const [svgLines, setSvgLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || lines.length === 0) { setSvgLines([]); return; }

    // Find all task bar rows by looking for data-task-bar attributes
    const barEls = container.querySelectorAll<HTMLElement>('[data-task-bar-id]');
    if (barEls.length === 0) { setSvgLines([]); return; }

    const containerRect = container.getBoundingClientRect();
    setDims({ w: containerRect.width, h: containerRect.height });

    // Build map of taskId -> center Y position and bar left/right X positions
    const taskPositions = new Map<string, { y: number; left: number; right: number }>();
    barEls.forEach(el => {
      const taskId = el.getAttribute('data-task-bar-id');
      if (!taskId) return;
      const rect = el.getBoundingClientRect();
      taskPositions.set(taskId, {
        y: rect.top - containerRect.top + rect.height / 2,
        left: rect.left - containerRect.left,
        right: rect.right - containerRect.left,
      });
    });

    // Build lines from anchor relationships
    const computed: { x1: number; y1: number; x2: number; y2: number }[] = [];
    tasksWithDates.forEach(task => {
      if (!task.anchoredTo) return;
      const toPos = taskPositions.get(task.id);
      if (!toPos) return;
      task.anchoredTo.forEach((predId: string) => {
        const fromPos = taskPositions.get(predId);
        if (!fromPos) return;
        computed.push({
          x1: fromPos.right,
          y1: fromPos.y,
          x2: toPos.left,
          y2: toPos.y,
        });
      });
    });

    setSvgLines(computed);
  }, [lines, containerRef, tasksWithDates, collapsedWorkflows]);

  if (svgLines.length === 0 || dims.w === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-20"
      width={dims.w}
      height={dims.h}
      style={{ overflow: 'visible' }}
    >
      {svgLines.map((line, i) => {
        const midX = (line.x1 + line.x2) / 2;
        return (
          <path
            key={i}
            d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.5}
          />
        );
      })}
    </svg>
  );
}

export default function GanttChart({ workflows, onUpdateTaskDate, onSetAnchor, onUpdateTaskStatus, onOpenResponsible, onOpenAnchor, getTaskName, selectedTaskIds, onTaskSelect, onHideTask, onClearSelection, fitToView = false, onShiftWorkflow }: GanttChartProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [editingDateType, setEditingDateType] = useState<'start' | 'end'>('start');
  const [collapsedWorkflows, setCollapsedWorkflows] = useState<Set<string>>(new Set());

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [pendingDrag, setPendingDrag] = useState<{
    workflowId: string;
    taskId: string;
    startDate: Date;
    days: number;
    origStartDate: Date;
    origDays: number;
    isSubtask: boolean;
    parentTaskId?: string;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Workflow drag state
  const [wfDragState, setWfDragState] = useState<WorkflowDragState | null>(null);
  const [wfDragDelta, setWfDragDelta] = useState<number>(0);
  const wfDragRef = useRef<WorkflowDragState | null>(null);
  const [pendingWorkflowShift, setPendingWorkflowShift] = useState<PendingWorkflowShift | null>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const { timelineStart, timelineEnd, totalDays, tasksWithDates } = useMemo(() => {
    type TaskWithMeta = {
      id: string;
      name: string;
      startDate: Date;
      estimatedDays: number;
      status: TaskStatus;
      anchoredTo?: string[];
      workflowId: string;
      workflowName: string;
      endDate: Date;
      isSubtask: boolean;
      parentTaskId?: string;
      parentTaskName?: string;
    };

    const allTasks: TaskWithMeta[] = [];
    
    workflows.forEach(w => {
      w.tasks.forEach(t => {
        if (t.startDate) {
          allTasks.push({
            id: t.id,
            name: t.name,
            startDate: t.startDate,
            estimatedDays: t.estimatedDays,
            status: t.status,
            anchoredTo: t.anchoredTo,
            workflowId: w.id,
            workflowName: w.name,
            endDate: addDays(t.startDate, t.estimatedDays),
            isSubtask: false,
          });
        }
        
        (t.subtasks || []).forEach(st => {
          if (st.type === 'full' && st.startDate && st.estimatedDays) {
            allTasks.push({
              id: st.id,
              name: st.name,
              startDate: st.startDate,
              estimatedDays: st.estimatedDays,
              status: st.status || 'pendiente',
              anchoredTo: st.anchoredTo,
              workflowId: w.id,
              workflowName: w.name,
              endDate: addDays(st.startDate, st.estimatedDays),
              isSubtask: true,
              parentTaskId: t.id,
              parentTaskName: t.name,
            });
          }
        });
      });
    });

    if (allTasks.length === 0) {
      const todayStart = startOfDay(new Date());
      return {
        timelineStart: todayStart,
        timelineEnd: addDays(todayStart, 90),
        totalDays: 90,
        tasksWithDates: [] as TaskWithMeta[],
      };
    }

    const startDates = allTasks.map(t => t.startDate);
    const endDates = allTasks.map(t => t.endDate);
    
    const earliest = startOfMonth(subMonths(startOfDay(min(startDates)), 1));
    const latest = startOfDay(max(endDates));
    const days = Math.max(differenceInDays(latest, earliest) + 7, 30);

    return {
      timelineStart: earliest,
      timelineEnd: addDays(earliest, days),
      totalDays: days,
      tasksWithDates: allTasks,
    };
  }, [workflows]);

  const todayPosition = useMemo(() => {
    const diff = differenceInDays(today, timelineStart);
    if (diff < 0 || diff > totalDays) return null;
    return (diff / totalDays) * 100;
  }, [today, timelineStart, totalDays]);

  const getBarPosition = (startDate: Date, days: number) => {
    const start = differenceInDays(startOfDay(startDate), timelineStart);
    const leftPercent = (start / totalDays) * 100;
    const widthPercent = (days / totalDays) * 100;
    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.min(widthPercent, 100 - leftPercent)}%`, leftNum: Math.max(0, leftPercent), widthNum: Math.min(widthPercent, 100 - leftPercent) };
  };

  // Compute dependency lines between anchored tasks
  const dependencyLines = useMemo(() => {
    const lines: { fromLeftPct: number; fromWidthPct: number; fromRow: number; toLeftPct: number; toRow: number; toWorkflowId: string; fromWorkflowId: string }[] = [];
    
    // Build a flat list of visible tasks in render order with row indices
    const visibleTasks: { id: string; workflowId: string; rowIndex: number; startDate: Date; estimatedDays: number; anchoredTo?: string[] }[] = [];
    let rowIdx = 0;
    workflows.forEach(w => {
      const wTasks = tasksWithDates.filter(t => t.workflowId === w.id);
      if (wTasks.length === 0) return;
      rowIdx++; // workflow header row
      if (collapsedWorkflows.has(w.id)) return;
      wTasks.forEach(t => {
        visibleTasks.push({ id: t.id, workflowId: w.id, rowIndex: rowIdx, startDate: t.startDate, estimatedDays: t.estimatedDays, anchoredTo: t.anchoredTo });
        rowIdx++;
      });
    });

    const taskMap = new Map(visibleTasks.map(t => [t.id, t]));

    visibleTasks.forEach(task => {
      if (!task.anchoredTo) return;
      task.anchoredTo.forEach(predId => {
        const pred = taskMap.get(predId);
        if (!pred) return;
        const predStart = differenceInDays(startOfDay(pred.startDate), timelineStart);
        const predLeftPct = Math.max(0, (predStart / totalDays) * 100);
        const predWidthPct = (pred.estimatedDays / totalDays) * 100;
        const taskStart = differenceInDays(startOfDay(task.startDate), timelineStart);
        const taskLeftPct = Math.max(0, (taskStart / totalDays) * 100);
        lines.push({
          fromLeftPct: predLeftPct,
          fromWidthPct: predWidthPct,
          fromRow: pred.rowIndex,
          toLeftPct: taskLeftPct,
          toRow: task.rowIndex,
          toWorkflowId: task.workflowId,
          fromWorkflowId: pred.workflowId,
        });
      });
    });

    return { lines, totalRows: rowIdx };
  }, [workflows, tasksWithDates, collapsedWorkflows, timelineStart, totalDays]);

  const months = useMemo(() => {
    const result: { label: string; startPercent: number; widthPercent: number }[] = [];
    let current = startOfDay(timelineStart);
    
    while (current <= timelineEnd) {
      const monthStart = current;
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const monthEnd = nextMonth > timelineEnd ? timelineEnd : nextMonth;
      
      const startDiff = differenceInDays(monthStart, timelineStart);
      const endDiff = differenceInDays(monthEnd, timelineStart);
      
      result.push({
        label: format(monthStart, 'MMMM yyyy', { locale: es }),
        startPercent: (startDiff / totalDays) * 100,
        widthPercent: ((endDiff - startDiff) / totalDays) * 100,
      });
      
      current = nextMonth;
    }
    return result;
  }, [timelineStart, timelineEnd, totalDays]);

  // --- Drag logic ---
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    taskId: string,
    workflowId: string,
    startDate: Date,
    estimatedDays: number,
    isSubtask: boolean,
    containerEl: HTMLElement | null,
  ) => {
    if (e.button !== 0 || !containerEl) return;
    e.preventDefault();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const barWidth = rect.width;

    let mode: DragState['mode'] = 'move';
    if (offsetX <= 6) mode = 'resize-left';
    else if (barWidth - offsetX <= 6) mode = 'resize-right';

    const state: DragState = {
      taskId,
      workflowId,
      mode,
      startX: e.clientX,
      origStartDate: startDate,
      origDays: estimatedDays,
      containerWidth: containerEl.getBoundingClientRect().width,
      activated: false,
      isSubtask,
    };
    dragRef.current = state;
    setDragState(state);
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;

      const deltaX = e.clientX - ds.startX;

      if (!ds.activated) {
        if (Math.abs(deltaX) < 3) return;
        ds.activated = true;
        dragRef.current = { ...ds, activated: true };
        setDragState(prev => prev ? { ...prev, activated: true } : null);
      }

      const deltaDays = Math.round((deltaX / ds.containerWidth) * totalDays);

      let newStart = ds.origStartDate;
      let newDays = ds.origDays;

      if (ds.mode === 'move') {
        newStart = addDays(ds.origStartDate, deltaDays);
      } else if (ds.mode === 'resize-right') {
        newDays = Math.max(1, ds.origDays + deltaDays);
      } else if (ds.mode === 'resize-left') {
        newStart = addDays(ds.origStartDate, deltaDays);
        newDays = Math.max(1, ds.origDays - deltaDays);
      }

      setDragPreview({ taskId: ds.taskId, startDate: newStart, days: newDays });
    };

    const handleMouseUp = () => {
      const ds = dragRef.current;
      if (ds?.activated && dragPreview && onUpdateTaskDate) {
        // Look up parentTaskId for subtasks
        let parentTaskId: string | undefined;
        if (ds.isSubtask) {
          const found = tasksWithDates.find(t => t.id === ds.taskId);
          parentTaskId = found?.parentTaskId;
        }
        // Store pending drag instead of applying immediately
        setPendingDrag({
          workflowId: ds.workflowId,
          taskId: ds.taskId,
          startDate: dragPreview.startDate,
          days: dragPreview.days,
          origStartDate: ds.origStartDate,
          origDays: ds.origDays,
          isSubtask: ds.isSubtask,
          parentTaskId,
        });
        // Keep dragPreview visible (don't clear it)
      } else {
        setDragPreview(null);
      }
      dragRef.current = null;
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, totalDays, onUpdateTaskDate, dragPreview, tasksWithDates]);

  const handleStartDateSelect = (workflowId: string, taskId: string, currentEndDate: Date, newStartDate: Date | undefined) => {
    if (newStartDate && onUpdateTaskDate) {
      const newDays = Math.max(1, differenceInDays(currentEndDate, newStartDate));
      onUpdateTaskDate(workflowId, taskId, newStartDate, newDays);
    }
  };

  const handleEndDateSelect = (workflowId: string, taskId: string, currentStartDate: Date, newEndDate: Date | undefined) => {
    if (newEndDate && onUpdateTaskDate) {
      const newDays = Math.max(1, differenceInDays(newEndDate, currentStartDate));
      onUpdateTaskDate(workflowId, taskId, currentStartDate, newDays);
    }
  };

  const handleConfirmDrag = () => {
    if (pendingDrag && onUpdateTaskDate) {
      if (pendingDrag.isSubtask && pendingDrag.parentTaskId) {
        onUpdateTaskDate(pendingDrag.workflowId, pendingDrag.parentTaskId, pendingDrag.startDate, pendingDrag.days, pendingDrag.taskId);
      } else {
        onUpdateTaskDate(pendingDrag.workflowId, pendingDrag.taskId, pendingDrag.startDate, pendingDrag.days);
      }
    }
    setPendingDrag(null);
    setDragPreview(null);
  };

  const handleCancelDrag = () => {
    setPendingDrag(null);
    setDragPreview(null);
  };

  // --- Workflow bar drag logic ---
  const handleWorkflowBarMouseDown = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    workflowId: string,
    containerEl: HTMLElement | null,
  ) => {
    if (e.button !== 0 || !containerEl) return;
    e.preventDefault();
    e.stopPropagation();

    const state: WorkflowDragState = {
      workflowId,
      startX: e.clientX,
      containerWidth: containerEl.getBoundingClientRect().width,
      activated: false,
    };
    wfDragRef.current = state;
    setWfDragState(state);
    setWfDragDelta(0);
  }, []);

  useEffect(() => {
    if (!wfDragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = wfDragRef.current;
      if (!ds) return;

      const deltaX = e.clientX - ds.startX;

      if (!ds.activated) {
        if (Math.abs(deltaX) < 3) return;
        ds.activated = true;
        wfDragRef.current = { ...ds, activated: true };
        setWfDragState(prev => prev ? { ...prev, activated: true } : null);
      }

      const deltaDays = Math.round((deltaX / ds.containerWidth) * totalDays);
      setWfDragDelta(deltaDays);
    };

    const handleMouseUp = () => {
      const ds = wfDragRef.current;
      if (ds?.activated && wfDragDelta !== 0) {
        const workflow = workflows.find(w => w.id === ds.workflowId);
        if (workflow) {
          const today = startOfDay(new Date());
          const tasksWithWarning = workflow.tasks
            .filter(t => {
              if (!t.startDate || t.status === 'completado') return false;
              const newEnd = addDays(addDays(t.startDate, wfDragDelta), t.estimatedDays);
              return isBefore(newEnd, today) || isSameDay(newEnd, today);
            })
            .map(t => ({ id: t.id, name: t.name }));

          setPendingWorkflowShift({
            workflowId: ds.workflowId,
            workflowName: workflow.name,
            daysDelta: wfDragDelta,
            tasksWithWarning,
          });
        }
      }
      wfDragRef.current = null;
      setWfDragState(null);
      setWfDragDelta(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [wfDragState, totalDays, wfDragDelta, workflows]);

  const handleConfirmWorkflowShift = () => {
    if (pendingWorkflowShift && onShiftWorkflow) {
      onShiftWorkflow(pendingWorkflowShift.workflowId, pendingWorkflowShift.daysDelta);
    }
    setPendingWorkflowShift(null);
  };

  const handleCancelWorkflowShift = () => {
    setPendingWorkflowShift(null);
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Añade fechas de inicio a las tareas para ver el cronograma</p>
      </div>
    );
  }

  const ganttMinWidth = fitToView ? undefined : Math.max(totalDays * 6, 800);

  return (
    <div className={cn(fitToView ? "space-y-1" : "space-y-4")} onClick={() => onClearSelection?.()}>
      <div className={cn(!fitToView && 'overflow-x-auto')}>
      <div style={{ minWidth: ganttMinWidth ? `${ganttMinWidth}px` : undefined }}>
      {/* Timeline Header */}
      <div className={cn("relative rounded-lg overflow-hidden border-b border-border", fitToView ? "h-7" : "h-10")}>
        {months.map((month, idx) => (
          <div
            key={idx}
            className={cn(
              "absolute top-0 h-full flex items-center justify-center border-r border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide",
              idx % 2 === 0 ? "bg-muted/20" : "bg-muted/40"
            )}
            style={{ left: `${month.startPercent}%`, width: `${month.widthPercent}%` }}
          >
            {month.widthPercent > 5 ? (
              <span className="truncate px-1">
                {month.widthPercent > 10 ? month.label : month.label.substring(0, 3)}
              </span>
            ) : null}
          </div>
        ))}
        {todayPosition !== null && (
          <div 
            className="absolute top-0 h-full z-10 flex flex-col items-center"
            style={{ left: `${todayPosition}%` }}
          >
            <span className="text-[9px] font-semibold text-red-500 -translate-x-1/2 leading-none mt-0.5">Hoy</span>
            <div className="w-0.5 flex-1 bg-red-500" />
          </div>
        )}
      </div>

      {/* Workflows + dependency lines overlay */}
      <div style={{ position: 'relative' }} ref={ganttContainerRef}>
      {/* Vertical month grid lines */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {months.map((month, idx) => (
          idx > 0 ? (
            <div
              key={`grid-${idx}`}
              className="absolute top-0 h-full border-l border-border/20"
              style={{ left: `${month.startPercent}%` }}
            />
          ) : null
        ))}
      </div>
      <div className="space-y-6 relative z-[1]">
        {workflows.map(workflow => {
          const workflowTasks = tasksWithDates.filter(t => t.workflowId === workflow.id);
          if (workflowTasks.length === 0) return null;
          const isCollapsed = collapsedWorkflows.has(workflow.id);

          return (
            <div key={workflow.id} data-workflow-id={workflow.id} className={cn('border-l-4 pl-4', WORKFLOW_COLORS[workflow.id])}>
              {/* Workflow header with inline summary bar */}
              {(() => {
                const dates = workflowTasks.map(t => startOfDay(t.startDate).getTime());
                const endDates = workflowTasks.map(t => startOfDay(addDays(t.startDate, t.estimatedDays)).getTime());
                const wfStart = new Date(Math.min(...dates));
                const wfEnd = new Date(Math.max(...endDates));
                const wfDays = Math.max(1, differenceInDays(wfEnd, wfStart));
                
                // Apply drag offset for preview
                const isWfDragging = wfDragState?.activated && wfDragState.workflowId === workflow.id;
                const previewStart = isWfDragging ? addDays(wfStart, wfDragDelta) : wfStart;
                const previewEnd = isWfDragging ? addDays(wfEnd, wfDragDelta) : wfEnd;
                const { left, width } = getBarPosition(previewStart, wfDays);
                const origBarPos = isWfDragging ? getBarPosition(wfStart, wfDays) : null;
                
                const completed = workflowTasks.filter(t => t.status === 'completado').length;
                const retrasadas = workflowTasks.filter(t => t.status === 'retrasado').length;
                const enProceso = workflowTasks.filter(t => t.status === 'en_proceso').length;
                const total = workflowTasks.length;

                const pctRetrasado = total > 0 ? (retrasadas / total) * 100 : 0;
                const pctEnProceso = total > 0 ? (enProceso / total) * 100 : 0;
                const pctCompletado = total > 0 ? (completed / total) * 100 : 0;

                const pendientes = total - retrasadas - enProceso - completed;
                const pctPendiente = total > 0 ? (pendientes / total) * 100 : 0;

                const wfBarContainerRef = React.createRef<HTMLDivElement>();

                return (
                  <div
                    className={cn("flex items-center select-none", fitToView ? "mb-0.5" : "mb-2")}
                  >
                    <div 
                      className="w-48 shrink-0 flex items-center gap-2 sticky left-0 z-10 bg-background cursor-pointer"
                      onClick={() => setCollapsedWorkflows(prev => {
                        const next = new Set(prev);
                        if (next.has(workflow.id)) next.delete(workflow.id);
                        else next.add(workflow.id);
                        return next;
                      })}
                    >
                      <span className="text-xs text-muted-foreground shrink-0">{isCollapsed ? '▶' : '▼'}</span>
                      <workflow.icon className="w-4 h-4 shrink-0" />
                      <span className="font-semibold text-sm truncate">{workflow.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {completed}/{total}
                      </span>
                    </div>
                    <div ref={wfBarContainerRef} className={cn("flex-1 relative", fitToView ? "h-4" : "h-6")}>
                      {/* Ghost bar at original position during workflow drag */}
                      {isWfDragging && origBarPos && (
                        <div
                          className={cn('absolute rounded-full overflow-hidden', fitToView ? 'top-0 h-4' : 'top-0.5 h-5')}
                          style={{ left: origBarPos.left, width: origBarPos.width, opacity: 0.25 }}
                        >
                          <div className="w-full h-full bg-muted-foreground/40" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'absolute rounded-full overflow-hidden group/wf bg-transparent',
                          fitToView ? 'top-0 h-4' : 'top-0.5 h-5',
                          onShiftWorkflow && 'cursor-ew-resize',
                          isWfDragging && 'ring-2 ring-primary shadow-lg',
                        )}
                        style={{ left, width }}
                        onMouseDown={(e) => {
                          if (!onShiftWorkflow) return;
                          handleWorkflowBarMouseDown(e, workflow.id, wfBarContainerRef.current);
                        }}
                      >
                        {/* Segmento completado */}
                        {completed > 0 && (
                          <div
                            className="absolute top-0 left-0 h-full bg-green-500/70"
                            style={{ width: `${pctCompletado}%` }}
                          />
                        )}
                        {/* Segmento en proceso */}
                        {enProceso > 0 && (
                          <div
                            className="absolute top-0 h-full bg-blue-500/70"
                            style={{ left: `${pctCompletado}%`, width: `${pctEnProceso}%` }}
                          />
                        )}
                        {/* Segmento retrasado */}
                        {retrasadas > 0 && (
                          <div
                            className="absolute top-0 h-full bg-red-500/70"
                            style={{ left: `${pctCompletado + pctEnProceso}%`, width: `${pctRetrasado}%` }}
                          />
                        )}
                        {/* Segmento pendientes — color clarito del flujo */}
                        {pendientes > 0 && (
                          <div
                            className={cn('absolute top-0 h-full', WORKFLOW_BAR_COLORS[workflow.id]?.bg || 'bg-primary/20')}
                            style={{ left: `${pctCompletado + pctEnProceso + pctRetrasado}%`, width: `${pctPendiente}%` }}
                          />
                        )}
                        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover/wf:opacity-100 transition-opacity pointer-events-none">
                          {isWfDragging
                            ? `${wfDragDelta > 0 ? '+' : ''}${wfDragDelta} días`
                            : <>
                                {format(wfStart, 'dd MMM', { locale: es })} – {format(wfEnd, 'dd MMM', { locale: es })}
                                {retrasadas > 0 && ` · ${retrasadas} retrasada${retrasadas > 1 ? 's' : ''}`}
                                {enProceso > 0 && ` · ${enProceso} en proceso`}
                                {completed > 0 && ` · ${completed} completada${completed > 1 ? 's' : ''}`}
                                {pendientes > 0 && ` · ${pendientes} pendiente${pendientes > 1 ? 's' : ''}`}
                              </>
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {!isCollapsed && <div className={fitToView ? "space-y-0.5" : "space-y-2"}>
                {workflowTasks.map(task => {
                  const isPendingThis = pendingDrag?.taskId === task.id;
                  const isDragging = (dragState?.activated && dragPreview?.taskId === task.id) || isPendingThis;
                  const activePreview = isPendingThis ? pendingDrag : dragPreview;
                  const displayStart = isDragging ? activePreview!.startDate : task.startDate;
                  const displayDays = isDragging ? activePreview!.days : task.estimatedDays;
                  const displayEnd = addDays(displayStart, displayDays);
                  const { left, width } = getBarPosition(displayStart, displayDays);
                  const dueDate = addDays(task.startDate, task.estimatedDays);
                  const origBarPos = isDragging ? getBarPosition(task.startDate, task.estimatedDays) : null;
                  const popoverId = `${workflow.id}-${task.id}`;
                  const isSelected = selectedTaskIds?.has(task.id) ?? false;

                  return (
                    <div key={task.id} className={cn(
                      "flex items-center gap-3",
                      task.isSubtask && "ml-4"
                    )}>
                      <div className={cn(
                        "text-sm truncate text-muted-foreground flex items-center gap-1 sticky left-0 z-10 bg-background",
                        task.isSubtask ? "w-44" : "w-48"
                      )}>
                        {task.isSubtask && (
                          <span className="text-muted-foreground/50 mr-0.5">↳</span>
                        )}
                        {task.anchoredTo && task.anchoredTo.length > 0 && (
                          <span 
                            className="text-primary" 
                            title={`Anclada a: ${task.anchoredTo.map(id => getTaskName?.(id) || id).join(', ')}`}
                          >
                            🔗{task.anchoredTo.length > 1 && <sup className="text-[10px]">{task.anchoredTo.length}</sup>}
                          </span>
                        )}
                        <span className={cn(task.isSubtask && "text-xs")} title={task.isSubtask ? `Subtarea de: ${task.parentTaskName}` : undefined}>
                          {task.name}
                        </span>
                      </div>
                      <GanttBarRow
                        task={task}
                        left={left}
                        width={width}
                        dueDate={dueDate}
                        displayStart={displayStart}
                        displayEnd={displayEnd}
                        popoverId={popoverId}
                        isSelected={isSelected}
                        isDragging={!!isDragging}
                        ghostLeft={origBarPos?.left}
                        ghostWidth={origBarPos?.width}
                        openPopover={openPopover}
                        setOpenPopover={setOpenPopover}
                        editingDateType={editingDateType}
                        setEditingDateType={setEditingDateType}
                        todayPosition={todayPosition}
                        onTaskSelect={onTaskSelect}
                        onBarMouseDown={handleBarMouseDown}
                        workflowId={workflow.id}
                        handleStartDateSelect={handleStartDateSelect}
                        handleEndDateSelect={handleEndDateSelect}
                        onHideTask={onHideTask}
                        onUpdateTaskStatus={onUpdateTaskStatus}
                        onOpenResponsible={onOpenResponsible}
                        onOpenAnchor={onOpenAnchor}
                        compact={fitToView}
                      />
                    </div>
                  );
                })}
              </div>}
            </div>
          );
        })}
      </div>
      {/* Dependency lines SVG overlay */}
      {dependencyLines.lines.length > 0 && (
        <DependencyLinesOverlay
          lines={dependencyLines.lines}
          containerRef={ganttContainerRef}
          workflows={workflows}
          tasksWithDates={tasksWithDates}
          collapsedWorkflows={collapsedWorkflows}
          fitToView={fitToView}
        />
      )}
      </div>

      {!fitToView && (
      <>
      {/* Legend */}
      <div className="flex items-center gap-6 pt-4 border-t">
        <span className="text-sm text-muted-foreground">Estado:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted-foreground/50" />
          <span className="text-sm">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-sm">En Proceso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-sm">Completado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-sm">Retrasado</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Arrastra las barras para mover fechas · Clic derecho para más opciones
      </p>
      </>
      )}

      {/* Drag confirmation dialog */}
      <AlertDialog open={!!pendingDrag} onOpenChange={(open) => { if (!open) handleCancelDrag(); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">¿Guardar cambios?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {pendingDrag ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="line-through opacity-60">
                    Anterior: {format(pendingDrag.origStartDate, 'dd MMM', { locale: es })} – {format(addDays(pendingDrag.origStartDate, pendingDrag.origDays), 'dd MMM', { locale: es })}
                  </div>
                  <div>
                    Nuevo: <strong>{format(pendingDrag.startDate, 'dd MMM', { locale: es })}</strong> – <strong>{format(addDays(pendingDrag.startDate, pendingDrag.days), 'dd MMM', { locale: es })}</strong>
                  </div>
                </div>
              ) : <span />}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDrag}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDrag}>Sobreescribir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Workflow shift confirmation dialog */}
      <AlertDialog open={!!pendingWorkflowShift} onOpenChange={(open) => { if (!open) handleCancelWorkflowShift(); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Mover {pendingWorkflowShift?.workflowName} {Math.abs(pendingWorkflowShift?.daysDelta || 0)} días hacia {(pendingWorkflowShift?.daysDelta || 0) > 0 ? 'adelante' : 'atrás'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Se desplazarán todas las tareas del flujo manteniendo sus intervalos relativos.
                </p>
                {pendingWorkflowShift?.tasksWithWarning && pendingWorkflowShift.tasksWithWarning.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Atención:</strong> {pendingWorkflowShift.tasksWithWarning.length} tarea{pendingWorkflowShift.tasksWithWarning.length > 1 ? 's' : ''} no completada{pendingWorkflowShift.tasksWithWarning.length > 1 ? 's' : ''} tendr{pendingWorkflowShift.tasksWithWarning.length > 1 ? 'án' : 'á'} fecha vencida ({pendingWorkflowShift.tasksWithWarning.map(t => t.name).join(', ')})
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWorkflowShift}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWorkflowShift}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
    </div>
  );
}

// --- Extracted bar row ---

interface GanttBarRowProps {
  task: {
    id: string;
    startDate: Date;
    estimatedDays: number;
    status: TaskStatus;
    isSubtask: boolean;
    workflowId: string;
  };
  left: string;
  width: string;
  dueDate: Date;
  displayStart: Date;
  displayEnd: Date;
  popoverId: string;
  isSelected: boolean;
  isDragging: boolean;
  ghostLeft?: string;
  ghostWidth?: string;
  openPopover: string | null;
  setOpenPopover: (id: string | null) => void;
  editingDateType: 'start' | 'end';
  setEditingDateType: (t: 'start' | 'end') => void;
  todayPosition: number | null;
  onTaskSelect?: (id: string) => void;
  onBarMouseDown: (
    e: React.MouseEvent<HTMLDivElement>,
    taskId: string,
    workflowId: string,
    startDate: Date,
    estimatedDays: number,
    isSubtask: boolean,
    containerEl: HTMLElement | null,
  ) => void;
  workflowId: string;
  handleStartDateSelect: (wId: string, tId: string, endDate: Date, newStart: Date | undefined) => void;
  handleEndDateSelect: (wId: string, tId: string, startDate: Date, newEnd: Date | undefined) => void;
  onHideTask?: (taskId: string) => void;
  onUpdateTaskStatus?: (workflowId: string, taskId: string, status: TaskStatus) => void;
  onOpenResponsible?: (workflowId: string, taskId: string) => void;
  onOpenAnchor?: (workflowId: string, taskId: string) => void;
  compact?: boolean;
}

function GanttBarRow({
  task, left, width, dueDate, displayStart, displayEnd, popoverId, isSelected, isDragging,
  ghostLeft, ghostWidth,
  openPopover, setOpenPopover, editingDateType, setEditingDateType,
  todayPosition, onTaskSelect, onBarMouseDown, workflowId,
  handleStartDateSelect, handleEndDateSelect, onHideTask,
  onUpdateTaskStatus, onOpenResponsible, onOpenAnchor, compact,
}: GanttBarRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const dateLabel = `${format(displayStart, 'dd MMM', { locale: es })} – ${format(displayEnd, 'dd MMM', { locale: es })}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 relative rounded",
        compact
          ? (task.isSubtask ? "h-3 bg-muted/10" : "h-5 bg-muted/20")
          : (task.isSubtask ? "h-4 bg-muted/10" : "h-8 bg-muted/20")
      )}
    >
      {todayPosition !== null && (
        <div 
          className="absolute top-0 h-full w-0.5 bg-red-500/50 z-10 pointer-events-none"
          style={{ left: `${todayPosition}%` }}
        />
      )}

      {/* Ghost bar at original position during drag */}
      {isDragging && ghostLeft && ghostWidth && (
        <div
          className={cn(
            'absolute rounded pointer-events-none',
            'bg-muted-foreground/40',
            compact
              ? (task.isSubtask ? 'top-0.5 h-2' : 'top-0 h-5')
              : (task.isSubtask ? 'top-[3px] h-2.5' : 'top-1 h-6'),
          )}
          style={{ left: ghostLeft, width: ghostWidth, minWidth: '16px', opacity: 0.25 }}
        />
      )}

      {/* Context menu wraps the bar */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            data-task-bar-id={task.id}
            className={cn(
              'absolute transition-all group',
              task.isSubtask ? 'rounded-sm' : 'rounded',
              STATUS_BAR_COLORS[task.status],
              compact
                ? (task.isSubtask ? 'top-0.5 h-2' : 'top-0 h-5')
                : (task.isSubtask ? 'top-[3px] h-2.5' : 'top-1 h-6'),
              task.isSubtask && 'opacity-70',
              isDragging
                ? 'opacity-90 ring-2 ring-primary shadow-lg'
                : isSelected
                  ? 'ring-2 ring-primary ring-offset-1'
                  : 'hover:ring-2 hover:ring-primary/50',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={{ left, width, minWidth: '16px' }}
            onMouseDown={(e) => {
              onBarMouseDown(e, task.id, workflowId, task.startDate, task.estimatedDays, task.isSubtask, containerRef.current);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTaskSelect?.(task.id);
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenPopover(popoverId);
              setEditingDateType('start');
            }}
          >
            {/* Resize handles */}
            <div className="absolute left-0 top-0 w-1.5 h-full cursor-ew-resize rounded-l opacity-0 group-hover:opacity-100 bg-foreground/20" />
            <div className="absolute right-0 top-0 w-1.5 h-full cursor-ew-resize rounded-r opacity-0 group-hover:opacity-100 bg-foreground/20" />

            {/* Inline date label - appears on hover or during drag */}
            <span
              className={cn(
                "absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-muted-foreground pointer-events-none transition-opacity pl-2",
                isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              style={{ left: '100%' }}
            >
              {dateLabel}
            </span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="bg-popover border border-border shadow-md z-50">
          {onUpdateTaskStatus && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="gap-2 text-sm">
                <CircleDot className="w-3.5 h-3.5" />
                Estado
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {([
                  { value: 'pendiente' as TaskStatus, label: 'Pendiente', dot: 'bg-muted-foreground/50' },
                  { value: 'en_proceso' as TaskStatus, label: 'En Proceso', dot: 'bg-blue-500' },
                  { value: 'completado' as TaskStatus, label: 'Completado', dot: 'bg-green-500' },
                  { value: 'retrasado' as TaskStatus, label: 'Retrasado', dot: 'bg-red-500' },
                ]).map(opt => (
                  <ContextMenuItem
                    key={opt.value}
                    onClick={() => onUpdateTaskStatus(workflowId, task.id, opt.value)}
                    className="gap-2 text-sm"
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full', opt.dot)} />
                    {opt.label}
                    {task.status === opt.value && <span className="ml-auto text-xs">✓</span>}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          {onOpenResponsible && (
            <ContextMenuItem onClick={() => onOpenResponsible(workflowId, task.id)} className="gap-2 text-sm">
              <User className="w-3.5 h-3.5" />
              Responsable
            </ContextMenuItem>
          )}
          {onOpenAnchor && (
            <ContextMenuItem onClick={() => onOpenAnchor(workflowId, task.id)} className="gap-2 text-sm">
              <Link2 className="w-3.5 h-3.5" />
              Anclar
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => {
              setOpenPopover(popoverId);
              setEditingDateType('start');
            }}
            className="gap-2 text-sm"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Abrir calendario
          </ContextMenuItem>
          {onHideTask && (
            <ContextMenuItem onClick={() => onHideTask(task.id)} className="gap-2 text-sm">
              <EyeOff className="w-3.5 h-3.5" />
              Ocultar tarea
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Calendar popover (opened from context menu) */}
      <Popover 
        open={openPopover === popoverId} 
        onOpenChange={(open) => {
          setOpenPopover(open ? popoverId : null);
          if (open) setEditingDateType('start');
        }}
      >
        <PopoverTrigger asChild>
          <span className="sr-only">calendar trigger</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="top">
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <button
                onClick={() => setEditingDateType('start')}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
                  editingDateType === 'start' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <CalendarIcon className="w-3 h-3 inline mr-1" />
                Inicio
              </button>
              <button
                onClick={() => setEditingDateType('end')}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
                  editingDateType === 'end' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <CalendarIcon className="w-3 h-3 inline mr-1" />
                Fin
              </button>
            </div>
          </div>
          <div className="p-3">
            <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
              <span>Inicio: {format(task.startDate!, 'dd MMM', { locale: es })}</span>
              <span>Fin: {format(dueDate, 'dd MMM', { locale: es })}</span>
            </div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {editingDateType === 'start' ? 'Seleccionar fecha de inicio' : 'Seleccionar fecha de fin'}
            </Label>
            <Calendar
              key={editingDateType}
              mode="single"
              defaultMonth={editingDateType === 'start' ? task.startDate! : dueDate}
              selected={editingDateType === 'start' ? task.startDate! : dueDate}
              onSelect={(date) => {
                if (editingDateType === 'start') {
                  handleStartDateSelect(workflowId, task.id, dueDate, date);
                } else {
                  handleEndDateSelect(workflowId, task.id, task.startDate!, date);
                }
                setOpenPopover(null);
              }}
              disabled={(date) => {
                if (editingDateType === 'end') return date <= task.startDate!;
                if (editingDateType === 'start') return date >= dueDate;
                return false;
              }}
              modifiers={{
                otherDate: editingDateType === 'start' ? [dueDate] : [task.startDate!],
                inRange: isAfter(dueDate, task.startDate!)
                  ? eachDayOfInterval({ start: task.startDate!, end: dueDate }).filter(
                      d => !isSameDay(d, task.startDate!) && !isSameDay(d, dueDate)
                    )
                  : [],
                rangeStart: [task.startDate!],
                rangeEnd: [dueDate],
              }}
              modifiersClassNames={{
                otherDate: "bg-primary/30 text-primary/70 rounded-md",
                inRange: "bg-accent/40 rounded-none",
                rangeStart: "bg-primary/20 rounded-l-md rounded-r-none",
                rangeEnd: "bg-primary/20 rounded-r-md rounded-l-none",
              }}
              initialFocus
              className="p-0 pointer-events-auto"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
