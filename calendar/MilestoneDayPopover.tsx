import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  ExternalLink,
  CalendarDays,
  Clock,
  Layers,
  Anchor,
  CheckSquare,
  StickyNote,
  Rocket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarMilestone } from '@/hooks/useCalendarReleases';

interface Props {
  milestone: CalendarMilestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clickedDate?: Date;
}

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  delayed: 'Retrasado',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  in_progress: 'secondary',
  completed: 'default',
  delayed: 'destructive',
};

const fmt = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), "d 'de' MMM yyyy", { locale: es }) : null;

const fmtShort = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), 'd MMM', { locale: es }) : null;

interface Subtask {
  title?: string;
  label?: string;
  done?: boolean;
  completed?: boolean;
}

export function MilestoneDayPopover({ milestone, open, onOpenChange, clickedDate }: Props) {
  const data = useMemo(() => {
    if (!milestone) return null;
    const meta = milestone.metadata || {};
    const startDate: string | null = meta.customStartDate || null;
    const estimatedDays: number | null =
      typeof meta.estimatedDays === 'number' ? meta.estimatedDays : null;

    // End date inferred from start + duration; fall back to due_date.
    let endDate: string | null = null;
    if (startDate && estimatedDays != null) {
      const d = parseISO(startDate);
      d.setDate(d.getDate() + Math.max(0, estimatedDays - 1));
      endDate = d.toISOString().slice(0, 10);
    }

    const subtasksRaw: Subtask[] = Array.isArray(meta.subtasks) ? meta.subtasks : [];
    const subtasks = subtasksRaw.map((s) => ({
      title: s.title || s.label || 'Sin título',
      done: !!(s.done ?? s.completed),
    }));
    const subtasksDone = subtasks.filter((s) => s.done).length;

    const rawAnchored = meta.anchoredTo;
    const anchoredIds: string[] = Array.isArray(rawAnchored)
      ? rawAnchored.filter(Boolean).map(String)
      : rawAnchored
        ? [String(rawAnchored)]
        : [];

    const referenceDate = clickedDate ?? new Date();
    const releaseDate = milestone.release?.release_date || null;
    const daysToRelease = releaseDate
      ? differenceInCalendarDays(parseISO(releaseDate), referenceDate)
      : null;

    const isPhase = (milestone.phase_count || 1) > 1;
    const isCompleted = milestone.status === 'completed';
    const isOverdue =
      !isCompleted &&
      milestone.due_date &&
      differenceInCalendarDays(parseISO(milestone.due_date), new Date()) < 0;

    return {
      meta,
      startDate,
      endDate,
      estimatedDays,
      subtasks,
      subtasksDone,
      anchoredIds,
      releaseDate,
      daysToRelease,
      isPhase,
      isOverdue,
      referenceDate,
    };
  }, [milestone, clickedDate]);

  // Resolve anchored milestone IDs → titles
  const [anchorTitles, setAnchorTitles] = useState<Record<string, string>>({});
  const [anchorsLoaded, setAnchorsLoaded] = useState(false);
  const anchorKey = (data?.anchoredIds || []).join(',');
  useEffect(() => {
    const ids = data?.anchoredIds || [];
    if (ids.length === 0) {
      setAnchorTitles({});
      setAnchorsLoaded(true);
      return;
    }
    let cancelled = false;
    setAnchorsLoaded(false);
    supabase
      .from('release_milestones')
      .select('id, title')
      .in('id', ids)
      .then(({ data: rows }) => {
        if (cancelled) return;
        setAnchorTitles(Object.fromEntries((rows || []).map((m: any) => [m.id, m.title])));
        setAnchorsLoaded(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey]);

  if (!milestone || !data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            <span className="truncate">{milestone.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Selected date highlight */}
          {clickedDate && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <span className="text-base font-semibold text-foreground capitalize">
                {format(clickedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant[milestone.status] || 'outline'}>
              {statusLabel[milestone.status] || milestone.status}
            </Badge>
            {milestone.category && <Badge variant="secondary">{milestone.category}</Badge>}
            {data.isOverdue && <Badge variant="destructive">Atrasado</Badge>}
          </div>

          {/* Release */}
          {milestone.release?.title && (
            <p className="text-muted-foreground">
              Lanzamiento:{' '}
              <span className="text-foreground font-medium">{milestone.release.title}</span>
            </p>
          )}

          <Separator />

          {/* Dates / duration */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <CalendarDays className="h-3.5 w-3.5" /> Fechas
            </div>
            {data.startDate ? (
              <p>
                <span className="text-muted-foreground">Inicio:</span>{' '}
                <span className="text-foreground">{fmt(data.startDate)}</span>
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">{data.endDate ? 'Fin previsto:' : 'Vence:'}</span>{' '}
              <span className="text-foreground">{fmt(data.endDate || milestone.due_date)}</span>
            </p>
            {data.estimatedDays != null && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Duración estimada:{' '}
                <span className="text-foreground">
                  {data.estimatedDays} {data.estimatedDays === 1 ? 'día' : 'días'}
                </span>
              </p>
            )}
          </div>

          {/* Phase context */}
          {data.isPhase && milestone.phase_start && milestone.phase_end && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                  <Layers className="h-3.5 w-3.5" /> Forma parte de la fase
                </div>
                <p>
                  <span className="text-foreground font-medium">
                    {milestone.category || 'Sin categoría'}
                  </span>
                  : {fmtShort(milestone.phase_start)} → {fmtShort(milestone.phase_end)}{' '}
                  <span className="text-muted-foreground">
                    ({milestone.phase_count} hitos)
                  </span>
                </p>
              </div>
            </>
          )}

          {/* Anchor */}
          {data.anchoredIds.length > 0 && (
            <p className="flex items-start gap-1.5 text-muted-foreground">
              <Anchor className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Anclado a:{' '}
              <span className="text-foreground break-words">
                {data.anchoredIds
                  .map((id) =>
                    anchorTitles[id]
                      ? anchorTitles[id]
                      : anchorsLoaded
                        ? 'Hito eliminado'
                        : 'Cargando…',
                  )
                  .join(', ')}
              </span>
            </p>
          )}

          {/* Countdown to release (relative to clicked date if provided) */}
          {data.daysToRelease !== null && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Rocket className="h-3.5 w-3.5" />
              {data.daysToRelease > 0
                ? <>Faltan <span className="text-foreground font-medium">{data.daysToRelease} {data.daysToRelease === 1 ? 'día' : 'días'}</span> para el lanzamiento{clickedDate ? ' desde esta fecha' : ''}</>
                : data.daysToRelease === 0
                  ? <span className="text-foreground font-medium">{clickedDate ? 'El lanzamiento es este día' : 'El lanzamiento es hoy'}</span>
                  : <>Lanzamiento publicado hace <span className="text-foreground font-medium">{Math.abs(data.daysToRelease)} {Math.abs(data.daysToRelease) === 1 ? 'día' : 'días'}</span>{clickedDate ? ' antes de esta fecha' : ''}</>
              }
            </p>
          )}

          {/* Responsible */}
          {milestone.responsible && (
            <p className="text-muted-foreground">
              Responsable: <span className="text-foreground">{milestone.responsible}</span>
            </p>
          )}

          {/* Subtasks */}
          {data.subtasks.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5" /> Subtareas
                  </span>
                  <span>
                    {data.subtasksDone} / {data.subtasks.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {data.subtasks.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${
                          s.done ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <span className={s.done ? 'line-through text-muted-foreground' : ''}>
                        {s.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Notes */}
          {milestone.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                  <StickyNote className="h-3.5 w-3.5" /> Notas
                </div>
                <p className="whitespace-pre-wrap">{milestone.notes}</p>
              </div>
            </>
          )}

          {milestone.release?.id && (
            <Button asChild className="w-full mt-2">
              <Link to={`/releases/${milestone.release.id}?tab=cronograma&milestone=${milestone.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver cronograma
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
