import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Receipt,
  Trash2,
  FileText,
  CheckCircle,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import { MarkExpensesAsInvoicedDialog } from './MarkExpensesAsInvoicedDialog';
import { ExpenseDialog } from './ExpenseDialog';
import { getCategoryLabel } from '@/lib/booking/expenseCategories';
import {
  computeShares,
  pushExpenseToBudget,
  unlinkExpenseFromBudget,
  formatShareSummary,
  type BookingExpense,
  type ExpenseInput,
} from '@/lib/booking/expenses';

interface BookingData {
  id: string;
  venue?: string | null;
  ciudad?: string | null;
  fecha?: string | null;
  promotor?: string | null;
  fee?: number | null;
}

interface BookingExpensesTabProps {
  bookingId: string;
  booking?: BookingData;
}

const PAGE_SIZE = 50;

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function BookingExpensesTab({ bookingId, booking }: BookingExpensesTabProps) {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<BookingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editing, setEditing] = useState<BookingExpense | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showMarkInvoicedDialog, setShowMarkInvoicedDialog] = useState(false);

  const fetchExpenses = useCallback(async (resetPage = true) => {
    try {
      setLoading(true);
      const targetPage = resetPage ? 0 : page;
      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await (supabase as any)
        .from('booking_expenses')
        .select('*')
        .eq('booking_id', bookingId)
        .order('expense_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      const rows = (data || []) as BookingExpense[];
      setExpenses(resetPage ? rows : [...expenses, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      if (resetPage) setPage(0);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      toast.error('No se pudieron cargar los imprevistos');
    } finally {
      setLoading(false);
    }
  }, [bookingId, page, expenses]);

  useEffect(() => {
    fetchExpenses(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleSubmit = async (input: ExpenseInput) => {
    const dbPayload = {
      booking_id: bookingId,
      description: input.description,
      category: input.category,
      amount: input.amount,
      iva_percentage: input.iva_percentage,
      irpf_percentage: input.irpf_percentage,
      other_tax_percentage: input.other_tax_percentage,
      other_tax_label: input.other_tax_label,
      handler: input.handler,
      payer: input.payer,
      expense_date: input.expense_date,
      invoice_url: input.invoice_url,
      invoice_number: input.invoice_number,
      split_mode: input.split_mode,
      split_promoter_pct: input.split_mode === 'split' ? input.split_promoter_pct : 0,
      split_agency_pct:   input.split_mode === 'split' ? input.split_agency_pct   : 0,
      split_artist_pct:   input.split_mode === 'split' ? input.split_artist_pct   : 0,
    };

    let expenseId: string;
    if (editing) {
      const { error } = await (supabase as any)
        .from('booking_expenses')
        .update(dbPayload)
        .eq('id', editing.id);
      if (error) throw error;
      expenseId = editing.id;
    } else {
      const { data, error } = await (supabase as any)
        .from('booking_expenses')
        .insert({ ...dbPayload, created_by: profile?.user_id })
        .select('*')
        .single();
      if (error) throw error;
      expenseId = data.id;
    }

    // Reload to get fresh row (with pushed_budget_item_id if any)
    const { data: fresh } = await (supabase as any)
      .from('booking_expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    const expense = fresh as BookingExpense;
    const shares = computeShares(expense);

    // Sync push to budget
    if (input.push_to_budget && shares.artist > 0) {
      try {
        await pushExpenseToBudget(expense);
        toast.success(
          `Añadido ${shares.artist.toFixed(2)} € al presupuesto del evento (${getCategoryLabel(expense.category)})`,
        );
      } catch (e: any) {
        toast.error(e?.message || 'No se pudo añadir al presupuesto');
      }
    } else if (!input.push_to_budget && expense.pushed_budget_item_id) {
      try {
        await unlinkExpenseFromBudget(expense);
      } catch (e) {
        console.error('Error unlinking from budget', e);
      }
    }

    toast.success(editing ? 'Imprevisto actualizado' : 'Imprevisto añadido');
    setEditing(null);
    fetchExpenses(true);
  };

  const handleDelete = async (expense: BookingExpense) => {
    try {
      // Unlink from budget first
      if (expense.pushed_budget_item_id) {
        await unlinkExpenseFromBudget(expense);
      }
      const { error } = await (supabase as any)
        .from('booking_expenses')
        .delete()
        .eq('id', expense.id);
      if (error) throw error;

      sonnerUndo(expense, () => fetchExpenses(true));
      fetchExpenses(true);
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast.error('No se pudo eliminar el imprevisto');
    }
  };

  // KPIs
  const totals = useMemo(() => {
    let total = 0;
    let promoter = 0;
    let agency = 0;
    let artist = 0;
    for (const e of expenses) {
      const s = computeShares(e);
      total    += Number(e.amount) || 0;
      promoter += s.promoter;
      agency   += s.agency;
      artist   += s.artist;
    }
    return { total, promoter, agency, artist };
  }, [expenses]);

  if (loading && expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold">{fmt(totals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Promotor</p>
            <p className="text-2xl font-bold">{fmt(totals.promoter)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Agencia</p>
            <p className="text-2xl font-bold">{fmt(totals.agency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Artista</p>
            <p className="text-2xl font-bold">{fmt(totals.artist)}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Imprevistos del Evento
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gastos extras no contemplados en el presupuesto
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {expenses.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowMarkInvoicedDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Marcar facturados
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowInvoiceDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" /> Generar factura
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => { setEditing(null); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Añadir imprevisto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-10 h-10 text-muted-foreground" />}
              title="Sin imprevistos registrados"
              description="Añade gastos extras que surjan el día del concierto y no estén en el presupuesto"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead>Reparto</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id} className="group">
                      <TableCell className="text-sm whitespace-nowrap">
                        {e.expense_date
                          ? new Date(e.expense_date).toLocaleDateString('es-ES')
                          : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {e.description}
                        {e.pushed_budget_item_id && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            En presupuesto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryLabel(e.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {fmt(Number(e.amount) || 0)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {Number(e.iva_percentage || 0)}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {Number(e.irpf_percentage || 0)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {formatShareSummary(e)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {e.invoice_url ? (
                          <a
                            href={e.invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            <FileText className="h-4 w-4" />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => { setEditing(e); setShowAddDialog(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => handleDelete(e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage((p) => p + 1);
                      fetchExpenses(false);
                    }}
                  >
                    Cargar más
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <ExpenseDialog
        open={showAddDialog}
        onOpenChange={(o) => {
          setShowAddDialog(o);
          if (!o) setEditing(null);
        }}
        bookingId={bookingId}
        defaultDate={booking?.fecha ?? null}
        initial={editing}
        onSubmit={handleSubmit}
      />

      {/* Invoice generator */}
      {booking && (
        <GenerateInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          booking={booking}
          expenses={expenses.map((e) => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount) || 0,
            category: e.category || null,
            payer: e.payer,
            handler: e.handler,
            iva_percentage: Number(e.iva_percentage) || 0,
          }))}
        />
      )}

      <MarkExpensesAsInvoicedDialog
        open={showMarkInvoicedDialog}
        onOpenChange={setShowMarkInvoicedDialog}
        expenses={expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount) || 0,
          category: e.category || null,
          payer: e.payer,
          handler: e.handler,
          iva_percentage: Number(e.iva_percentage) || 0,
        }))}
        onSuccess={() => fetchExpenses(true)}
      />
    </div>
  );
}

function sonnerUndo(snapshot: BookingExpense, onRestored: () => void) {
  toast.success('Imprevisto eliminado', {
    duration: 5000,
    action: {
      label: 'Deshacer',
      onClick: async () => {
        const { id, ...rest } = snapshot as any;
        // Re-insert with original id to keep pushed link consistent
        const { error } = await (supabase as any)
          .from('booking_expenses')
          .insert({ id, ...rest });
        if (error) toast.error('No se pudo deshacer');
        else {
          toast.success('Acción revertida');
          onRestored();
        }
      },
    },
  });
}
