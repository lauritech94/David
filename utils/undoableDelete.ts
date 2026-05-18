import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UndoableDeleteOptions {
  /** Supabase table name */
  table: string;
  /** Row ID to delete */
  id: string;
  /** Toast message shown after deletion */
  successMessage: string;
  /** Called after delete or after undo to refresh queries */
  onComplete?: () => void;
  /** Toast duration in ms (default 5000) */
  duration?: number;
}

/**
 * Deletes a row from a Supabase table and shows a toast with an "Undo" button.
 * If the user clicks "Undo" within the timeout, the row is re-inserted.
 */
export async function undoableDelete({
  table,
  id,
  successMessage,
  onComplete,
  duration = 5000,
}: UndoableDeleteOptions): Promise<void> {
  // 1. Snapshot the row before deleting
  const { data: snapshot, error: selectError } = await (supabase as any)
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (selectError || !snapshot) {
    toast.error('Error al eliminar');
    return;
  }

  // 2. Delete the row
  const { error: deleteError } = await (supabase as any)
    .from(table)
    .delete()
    .eq('id', id);

  if (deleteError) {
    toast.error('Error al eliminar: ' + deleteError.message);
    return;
  }

  // 3. Refresh queries immediately so UI updates
  onComplete?.();

  // 4. Show toast with undo action
  toast.success(successMessage, {
    duration,
    action: {
      label: 'Deshacer',
      onClick: async () => {
        const { error: insertError } = await (supabase as any)
          .from(table)
          .insert(snapshot);

        if (insertError) {
          toast.error('Error al deshacer: ' + insertError.message);
        } else {
          toast.success('Acción revertida');
          onComplete?.();
        }
      },
    },
  });
}

interface UndoableDeleteCustomOptions {
  /** Custom delete action */
  deleteAction: () => Promise<void>;
  /** Custom undo action (re-insert, restore storage, etc.) */
  undoAction: () => Promise<void>;
  /** Toast message */
  successMessage: string;
  /** Called after delete or undo */
  onComplete?: () => void;
  /** Toast duration in ms */
  duration?: number;
}

/**
 * Custom undoable delete for complex cases (storage cleanup, cascade, etc.)
 */
export async function undoableDeleteCustom({
  deleteAction,
  undoAction,
  successMessage,
  onComplete,
  duration = 5000,
}: UndoableDeleteCustomOptions): Promise<void> {
  try {
    await deleteAction();
  } catch (error: any) {
    toast.error('Error al eliminar: ' + (error?.message || 'Error desconocido'));
    return;
  }

  onComplete?.();

  toast.success(successMessage, {
    duration,
    action: {
      label: 'Deshacer',
      onClick: async () => {
        try {
          await undoAction();
          toast.success('Acción revertida');
          onComplete?.();
        } catch (error: any) {
          toast.error('Error al deshacer: ' + (error?.message || 'Error desconocido'));
        }
      },
    },
  });
}
