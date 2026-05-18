import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  payer: string;
  handler: string;
  iva_percentage: number | null;
}

interface MarkExpensesAsInvoicedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  onSuccess: () => void;
}

export function MarkExpensesAsInvoicedDialog({
  open,
  onOpenChange,
  expenses,
  onSuccess,
}: MarkExpensesAsInvoicedDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Filter promoter expenses that are NOT already invoiced
  const promoterExpenses = expenses.filter(
    (e) => e.payer === 'promoter' && !e.category?.startsWith('invoiced:')
  );

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === promoterExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(promoterExpenses.map((e) => e.id)));
    }
  };

  const selectedTotal = promoterExpenses
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + e.amount, 0);

  const handleMarkAsInvoiced = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un gasto');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll store invoice info in a simple way
      // In a full implementation, you might want a separate invoices table
      const { error } = await (supabase as any)
        .from('booking_expenses')
        .update({
          category: `invoiced:${invoiceNumber}:${invoiceDate}`,
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} gastos marcados como facturados`);
      setSelectedIds(new Set());
      setInvoiceNumber('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking as invoiced:', error);
      toast.error('Error al marcar como facturados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Marcar Gastos como Facturados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Selecciona los gastos repercutibles al promotor que ya han sido facturados.
          </p>

          {promoterExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay gastos pendientes de facturar al promotor
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === promoterExpenses.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoterExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(expense.id)}
                            onCheckedChange={() => toggleItem(expense.id)}
                          />
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {expense.amount.toFixed(2)} €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedIds.size > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gastos seleccionados:</span>
                    <Badge variant="secondary">{selectedIds.size}</Badge>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span>Total a facturar:</span>
                    <span className="font-mono">{selectedTotal.toFixed(2)} €</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">Nº Factura</Label>
                      <Input
                        id="invoiceNumber"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceDate">Fecha factura</Label>
                      <Input
                        id="invoiceDate"
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleMarkAsInvoiced}
            disabled={loading || selectedIds.size === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Marcar como Facturados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
