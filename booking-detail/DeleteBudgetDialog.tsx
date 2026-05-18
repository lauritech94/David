import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Trash2, FileText, DollarSign, ShieldAlert, Star } from 'lucide-react';
import {
  getBudgetDeletionImpact,
  deleteBudget,
  type BudgetDeletionImpact,
} from '@/lib/budgets/bookingBudgetActions';
import { toast } from '@/hooks/use-toast';

interface Props {
  budgetId: string | null;
  budgetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export function DeleteBudgetDialog({
  budgetId,
  budgetName,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  const { data: impact, isLoading } = useQuery<BudgetDeletionImpact>({
    queryKey: ['budget-deletion-impact', budgetId],
    queryFn: () => getBudgetDeletionImpact(budgetId!),
    enabled: !!budgetId && open,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!budgetId) throw new Error('Sin presupuesto');
      await deleteBudget(budgetId);
    },
    onSuccess: () => {
      toast({ title: 'Presupuesto eliminado' });
      onOpenChange(false);
      onDeleted();
    },
    onError: (err: any) => {
      toast({
        title: 'No se pudo eliminar',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const blocked = !!impact?.hasPaidItems;
  const matches = confirmText.trim().toUpperCase() === 'CONFIRMAR';
  const canDelete = !blocked && matches && !!impact && !deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            ¿Eliminar "{budgetName}"?
          </DialogTitle>
          <DialogDescription>
            Esta acción es permanente. Revisa lo que se perderá antes de continuar.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !impact ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-semibold">Se perderá:</p>
              <ul className="text-sm space-y-1.5">
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{impact.itemCount}</strong>{' '}
                    {impact.itemCount === 1 ? 'partida' : 'partidas'} de presupuesto
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Capital total: <strong>{fmt(impact.totalCapital)}</strong>
                  </span>
                </li>
                {impact.totalPaid > 0 && (
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Pagado registrado: <strong>{fmt(impact.totalPaid)}</strong>
                    </span>
                  </li>
                )}
                {impact.isPrimary && (
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>
                      Es el presupuesto <strong>primario</strong> del booking. Se promoverá
                      automáticamente otro como primario.
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {impact.hasReconciledItems && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 flex gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Tiene <strong>{impact.reconciledItemCount}</strong>{' '}
                  {impact.reconciledItemCount === 1 ? 'partida conciliada' : 'partidas conciliadas'}.
                  Eliminar puede alterar el cierre fiscal correspondiente.
                </p>
              </div>
            )}

            {blocked && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p>
                  <strong>No se puede eliminar:</strong> hay {impact.paidItemCount}{' '}
                  {impact.paidItemCount === 1 ? 'partida cobrada/pagada' : 'partidas cobradas/pagadas'}.
                  Desvincula los cobros desde Finanzas antes de eliminar el presupuesto.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Esta acción no se puede deshacer.
            </p>

            {!blocked && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm-name" className="text-sm">
                  Para confirmar, escribe <strong>CONFIRMAR</strong>:
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRMAR"
                  autoComplete="off"
                  autoCapitalize="characters"
                  disabled={deleteMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={!canDelete}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
