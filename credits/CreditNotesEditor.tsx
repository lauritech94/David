import { useEffect, useRef, useState } from 'react';
import { StickyNote, Loader2, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  CreditNote,
  CreditNoteScope,
  useCreditNotes,
  useSaveCreditNote,
} from '@/hooks/useCreditNotes';
import { cn } from '@/lib/utils';

interface CreditNotesEditorProps {
  releaseId: string;
  scope: CreditNoteScope;
  /** null = nota global del release; uuid = nota de una canción */
  trackId?: string | null;
  variant?: 'banner' | 'inline';
  label?: string;
  placeholder?: string;
}

/**
 * Editor reutilizable para notas de créditos (Publishing / Master).
 * - variant 'banner': nota global del release, expandible.
 * - variant 'inline': nota por canción, textarea siempre visible.
 * Autosave con debounce de 800ms.
 */
export function CreditNotesEditor({
  releaseId,
  scope,
  trackId = null,
  variant = 'inline',
  label,
  placeholder = 'Añade un comentario o aclaración…',
}: CreditNotesEditorProps) {
  const { data: notes = [] } = useCreditNotes(releaseId, scope);
  const saveMutation = useSaveCreditNote();

  const existing: CreditNote | undefined = notes.find((n) =>
    trackId === null ? n.track_id === null : n.track_id === trackId
  );

  const [value, setValue] = useState(existing?.note ?? '');
  const [isExpanded, setIsExpanded] = useState(variant === 'inline' || !!existing);
  const [savedFlash, setSavedFlash] = useState(false);
  const lastSavedRef = useRef<string>(existing?.note ?? '');

  // Sync when remote data updates and user hasn't typed something different
  useEffect(() => {
    const remote = existing?.note ?? '';
    if (remote !== lastSavedRef.current && remote !== value) {
      setValue(remote);
      lastSavedRef.current = remote;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.note]);

  // Debounced autosave
  useEffect(() => {
    if (value === lastSavedRef.current) return;
    const t = setTimeout(() => {
      saveMutation.mutate(
        {
          releaseId,
          scope,
          trackId,
          note: value,
          existingId: existing?.id ?? null,
        },
        {
          onSuccess: () => {
            lastSavedRef.current = value;
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1500);
          },
        }
      );
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (variant === 'banner' && !isExpanded && !existing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsExpanded(true)}
      >
        <StickyNote className="h-4 w-4" />
        Añadir nota general
      </Button>
    );
  }

  const charCount = value.length;
  const isSaving = saveMutation.isPending;

  return (
    <div
      className={cn(
        'space-y-1.5',
        variant === 'banner' &&
          'rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-500/5 dark:border-amber-500/30 p-3'
      )}
    >
      <div className="flex items-center justify-between">
        <Label
          htmlFor={`note-${scope}-${trackId ?? 'global'}`}
          className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground"
        >
          <StickyNote className="h-3.5 w-3.5" />
          {label ?? (trackId === null ? 'Nota general' : 'Notas')}
        </Label>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          {savedFlash && !isSaving && <Check className="h-3 w-3 text-emerald-600" />}
          <span>{charCount}/2000</span>
        </div>
      </div>
      <Textarea
        id={`note-${scope}-${trackId ?? 'global'}`}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 2000))}
        placeholder={placeholder}
        className="min-h-[60px] text-sm resize-y"
      />
    </div>
  );
}

/** Indicador compacto para mostrar que existe una nota. */
export function CreditNoteBadge({
  releaseId,
  scope,
  trackId,
}: {
  releaseId: string;
  scope: CreditNoteScope;
  trackId?: string | null;
}) {
  const { data: notes = [] } = useCreditNotes(releaseId, scope);
  const has = notes.some((n) =>
    trackId === undefined || trackId === null
      ? n.track_id === null
      : n.track_id === trackId
  );
  if (!has) return null;
  return (
    <StickyNote
      className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
      aria-label="Tiene nota"
    />
  );
}
