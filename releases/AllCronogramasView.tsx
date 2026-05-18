import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Music, Palette, Package, Video, Megaphone, Mic2, Disc3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAllReleaseMilestones } from '@/hooks/useAllReleaseMilestones';
import type { Release, ReleaseMilestone } from '@/hooks/useReleases';

const WORKFLOW_META: Record<string, { name: string; icon: React.ElementType; barColor: string; bgColor: string }> = {
  audio: { name: 'Audio', icon: Music, barColor: 'bg-blue-500', bgColor: 'bg-blue-500/15' },
  visual: { name: 'Visual', icon: Palette, barColor: 'bg-pink-500', bgColor: 'bg-pink-500/15' },
  fabricacion: { name: 'Fabricación', icon: Package, barColor: 'bg-yellow-500', bgColor: 'bg-yellow-500/15' },
  contenido: { name: 'Contenido', icon: Video, barColor: 'bg-purple-500', bgColor: 'bg-purple-500/15' },
  marketing: { name: 'Marketing', icon: Megaphone, barColor: 'bg-orange-500', bgColor: 'bg-orange-500/15' },
  directo: { name: 'Directo', icon: Mic2, barColor: 'bg-green-500', bgColor: 'bg-green-500/15' },
};

const STATUS_BAR_COLORS: Record<string, string> = {
  completado: 'bg-green-500',
  en_proceso: 'bg-blue-500',
  retrasado: 'bg-red-500',
  pendiente: 'bg-muted-foreground/40',
};

interface WorkflowSummary {
  id: string;
  name: string;
  icon: React.ElementType;
  barColor: string;
  bgColor: string;
  startDate: Date;
  endDate: Date;
  total: number;
  completed: number;
  dominantStatus: string;
}

function getWorkflowSummaries(milestones: ReleaseMilestone[]): WorkflowSummary[] {
  const byCategory: Record<string, ReleaseMilestone[]> = {};
  for (const m of milestones) {
    const cat = m.category || 'audio';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(m);
  }

  return Object.entries(byCategory)
    .filter(([id]) => WORKFLOW_META[id])
    .map(([id, tasks]) => {
      const meta = WORKFLOW_META[id];
      const withDates = tasks.filter(t => t.due_date);
      const dates = withDates.map(t => new Date(t.due_date!).getTime());
      const completed = tasks.filter(t => t.status === 'completed').length;
      const delayed = tasks.filter(t => t.status === 'delayed').length;
      const inProgress = tasks.filter(t => t.status === 'in_progress').length;

      let dominantStatus = 'pendiente';
      if (completed === tasks.length) dominantStatus = 'completado';
      else if (delayed > 0) dominantStatus = 'retrasado';
      else if (inProgress > 0) dominantStatus = 'en_proceso';

      return {
        id,
        ...meta,
        startDate: dates.length ? new Date(Math.min(...dates)) : new Date(),
        endDate: dates.length ? new Date(Math.max(...dates)) : new Date(),
        total: tasks.length,
        completed,
        dominantStatus,
      };
    });
}

interface AllCronogramasViewProps {
  releases: Release[];
}

export default function AllCronogramasView({ releases }: AllCronogramasViewProps) {
  const navigate = useNavigate();
  const releaseIds = useMemo(() => releases.map(r => r.id), [releases]);
  const { data: milestonesByRelease, isLoading } = useAllReleaseMilestones(releaseIds);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const today = useMemo(() => new Date(), []);

  // Calculate global time range
  const { globalStart, globalEnd, months, totalDays } = useMemo(() => {
    if (!milestonesByRelease) return { globalStart: new Date(), globalEnd: new Date(), months: [], totalDays: 1 };

    let minDate = Infinity;
    let maxDate = -Infinity;
    for (const ms of Object.values(milestonesByRelease)) {
      for (const m of ms) {
        if (m.due_date) {
          const t = new Date(m.due_date).getTime();
          if (t < minDate) minDate = t;
          if (t > maxDate) maxDate = t;
        }
      }
    }

    if (minDate === Infinity) {
      const now = new Date();
      return { globalStart: now, globalEnd: addDays(now, 90), months: [], totalDays: 90 };
    }

    const start = startOfMonth(new Date(minDate));
    const end = endOfMonth(addDays(new Date(maxDate), 14));
    const months = eachMonthOfInterval({ start, end });
    return { globalStart: start, globalEnd: end, months, totalDays: Math.max(differenceInDays(end, start), 1) };
  }, [milestonesByRelease]);

  const todayLeft = useMemo(() => {
    if (today < globalStart || today > globalEnd) return null;
    return (differenceInDays(today, globalStart) / totalDays) * 100;
  }, [today, globalStart, globalEnd, totalDays]);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getBarStyle = (start: Date, end: Date) => {
    const left = Math.max(0, differenceInDays(start, globalStart) / totalDays * 100);
    const width = Math.max(1, (differenceInDays(end, start) + 1) / totalDays * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!milestonesByRelease || Object.keys(milestonesByRelease).length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <Disc3 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">No hay cronogramas con tareas para mostrar</p>
      </div>
    );
  }

  // Filter releases that actually have milestones
  const releasesWithMilestones = releases.filter(r => milestonesByRelease[r.id]?.length);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border bg-card overflow-hidden relative">
        {/* Today line overlay – spans full height */}
        {todayLeft !== null && (
          <div
            className="absolute pointer-events-none z-20"
            style={{ left: `calc(256px + (100% - 256px) * ${todayLeft / 100})`, top: 0, bottom: 0, width: 0 }}
          >
            <div className="relative h-full">
              <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-red-500" />
              <div className="absolute left-[-10px] top-0 bg-red-500 text-white text-[9px] font-bold px-1 rounded-b leading-tight">
                Hoy
              </div>
            </div>
          </div>
        )}

        {/* Month header */}
        <div className="flex border-b bg-muted/30">
          <div className="w-64 min-w-[256px] shrink-0 px-4 py-2 text-xs font-medium text-muted-foreground border-r">
            Lanzamiento / Flujo
          </div>
          <div className="flex-1 relative">
            <div className="flex h-full">
              {months.map((month, i) => {
                const monthStart = month;
                const monthEnd = endOfMonth(month);
                const style = getBarStyle(monthStart, monthEnd);
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-border/50 flex items-center px-2"
                    style={{ left: style.left, width: style.width }}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground uppercase truncate">
                      {format(month, 'MMM yyyy', { locale: es })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Releases */}
        {releasesWithMilestones.map((release) => {
          const milestones = milestonesByRelease[release.id] || [];
          const summaries = getWorkflowSummaries(milestones);
          const isCollapsed = collapsed[release.id] ?? false;
          const totalTasks = summaries.reduce((s, w) => s + w.total, 0);
          const completedTasks = summaries.reduce((s, w) => s + w.completed, 0);

          return (
            <div key={release.id} className="border-b last:border-b-0">
              {/* Release header */}
              {(() => {
                const releaseStart = summaries.length ? new Date(Math.min(...summaries.map(w => w.startDate.getTime()))) : new Date();
                const releaseEnd = summaries.length ? new Date(Math.max(...summaries.map(w => w.endDate.getTime()))) : new Date();
                const releaseBarStyle = getBarStyle(releaseStart, releaseEnd);
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                return (
                  <div
                    className="flex items-center bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => toggleCollapse(release.id)}
                  >
                    <div className="w-64 min-w-[256px] shrink-0 px-4 py-2.5 flex items-center gap-2 border-r">
                      <button className="text-muted-foreground shrink-0">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {release.cover_image_url ? (
                        <img src={release.cover_image_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                          <Disc3 className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span
                        className="font-semibold text-sm truncate hover:text-primary cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); navigate(`/releases/${release.id}/cronograma?mode=list&collapsed=all`); }}
                      >
                        {release.title}
                      </span>
                      <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
                        {completedTasks}/{totalTasks}
                      </Badge>
                    </div>
                    <div className="flex-1 relative h-10 px-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-2 h-6 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors cursor-pointer"
                            style={releaseBarStyle}
                            onClick={(e) => { e.stopPropagation(); navigate(`/releases/${release.id}/cronograma`); }}
                          >
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{release.title}</p>
                          <p>{completedTasks}/{totalTasks} completadas ({Math.round(progress)}%)</p>
                          <p className="text-muted-foreground">
                            {format(releaseStart, 'dd MMM', { locale: es })} → {format(releaseEnd, 'dd MMM yyyy', { locale: es })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })()}

              {/* Workflow rows */}
              {!isCollapsed && summaries.map((wf) => {
                const barStyle = getBarStyle(wf.startDate, wf.endDate);
                const Icon = wf.icon;
                const statusColor = STATUS_BAR_COLORS[wf.dominantStatus] || STATUS_BAR_COLORS.pendiente;

                return (
                  <div key={wf.id} className="flex items-center border-t border-border/30">
                    <div className="w-64 min-w-[256px] shrink-0 px-4 py-2 flex items-center gap-2 border-r">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{wf.name}</span>
                      <span className="text-[10px] text-muted-foreground/70 ml-auto shrink-0">
                        {wf.completed}/{wf.total}
                      </span>
                    </div>
                    <div className="flex-1 relative h-8 px-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-1.5 h-5 rounded-full ${statusColor} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                            style={barStyle}
                            onClick={() => navigate(`/releases/${release.id}/cronograma?focus=${wf.id}`)}
                          >
                            <div
                              className="h-full rounded-full bg-foreground/10"
                              style={{ width: wf.total > 0 ? `${(wf.completed / wf.total) * 100}%` : '0%' }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{release.title} — {wf.name}</p>
                          <p>{wf.completed}/{wf.total} completadas</p>
                          <p className="text-muted-foreground">
                            {format(wf.startDate, 'dd MMM', { locale: es })} → {format(wf.endDate, 'dd MMM yyyy', { locale: es })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
