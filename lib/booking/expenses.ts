import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryLabel } from './expenseCategories';

// ─── Tipos ────────────────────────────────────────────────────────────
export type ExpensePayer = 'agency' | 'promoter' | 'artist';
export type SplitMode = 'single' | 'split';

export interface BookingExpense {
  id: string;
  booking_id: string;
  description: string;
  amount: number;
  iva_percentage: number;
  irpf_percentage: number;
  other_tax_percentage: number;
  other_tax_label: string | null;
  handler: string;
  payer: ExpensePayer;
  category: string | null;
  expense_date: string | null;
  invoice_url: string | null;
  invoice_number: string | null;
  split_mode: SplitMode;
  split_promoter_pct: number;
  split_agency_pct: number;
  split_artist_pct: number;
  pushed_budget_item_id: string | null;
  created_at: string;
}

// ─── Validación ───────────────────────────────────────────────────────
export const expenseInputSchema = z
  .object({
    description: z.string().trim().min(1, 'La descripción es obligatoria').max(200),
    category: z.string().min(1, 'La categoría es obligatoria').max(80),
    amount: z.number().nonnegative('El importe no puede ser negativo'),
    iva_percentage: z.number().min(0).max(100),
    irpf_percentage: z.number().min(0).max(100),
    other_tax_percentage: z.number().min(0).max(100),
    other_tax_label: z.string().trim().max(60).nullable(),
    handler: z.enum(['agency', 'promoter', 'artist']),
    payer: z.enum(['agency', 'promoter', 'artist']),
    expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    invoice_url: z.string().url().nullable(),
    invoice_number: z.string().trim().max(60).nullable(),
    split_mode: z.enum(['single', 'split']),
    split_promoter_pct: z.number().min(0).max(100),
    split_agency_pct: z.number().min(0).max(100),
    split_artist_pct: z.number().min(0).max(100),
    push_to_budget: z.boolean(),
  })
  .refine(
    (d) =>
      d.split_mode === 'single' ||
      Math.round(
        (d.split_promoter_pct + d.split_agency_pct + d.split_artist_pct) * 100,
      ) === 10000,
    { message: 'Los porcentajes deben sumar 100', path: ['split_promoter_pct'] },
  );

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

// ─── Cálculos ─────────────────────────────────────────────────────────
export interface ExpenseShares {
  promoter: number;
  agency: number;
  artist: number;
}

/** Devuelve el importe neto que asume cada parte. */
export function computeShares(e: {
  amount: number;
  payer: ExpensePayer;
  split_mode: SplitMode;
  split_promoter_pct: number;
  split_agency_pct: number;
  split_artist_pct: number;
}): ExpenseShares {
  const amount = Number(e.amount) || 0;
  if (e.split_mode === 'split') {
    return {
      promoter: round2((amount * (Number(e.split_promoter_pct) || 0)) / 100),
      agency:   round2((amount * (Number(e.split_agency_pct)   || 0)) / 100),
      artist:   round2((amount * (Number(e.split_artist_pct)   || 0)) / 100),
    };
  }
  return {
    promoter: e.payer === 'promoter' ? amount : 0,
    agency:   e.payer === 'agency'   ? amount : 0,
    artist:   e.payer === 'artist'   ? amount : 0,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Push al presupuesto del evento ──────────────────────────────────
export async function pushExpenseToBudget(expense: BookingExpense): Promise<string | null> {
  const shares = computeShares(expense);
  const artistAmount = shares.artist;

  // Localizar el budget principal del booking
  const { data: budgets, error: bErr } = await supabase
    .from('budgets')
    .select('id')
    .eq('booking_offer_id', expense.booking_id)
    .eq('is_primary_for_booking', true)
    .limit(1);

  if (bErr) throw bErr;
  const budgetId = budgets?.[0]?.id;
  if (!budgetId) {
    throw new Error('Este booking no tiene un presupuesto principal. Crea uno antes de añadir el imprevisto al presupuesto.');
  }

  const itemPayload = {
    budget_id: budgetId,
    category: expense.category || 'otros',
    subcategory: 'imprevistos',
    name: `[Imprevisto] ${expense.description}`,
    quantity: 1,
    unit_price: artistAmount,
    iva_percentage: expense.iva_percentage,
    irpf_percentage: expense.irpf_percentage,
    observations: [
      'Generado desde imprevistos',
      expense.expense_date,
      expense.invoice_number ? `Factura ${expense.invoice_number}` : null,
    ].filter(Boolean).join(' · '),
  };

  // Si ya estaba pusheado → actualizar
  if (expense.pushed_budget_item_id) {
    const { error: updErr } = await supabase
      .from('budget_items')
      .update(itemPayload)
      .eq('id', expense.pushed_budget_item_id);
    if (updErr) throw updErr;
    return expense.pushed_budget_item_id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('budget_items')
    .insert(itemPayload as any)
    .select('id')
    .single();
  if (insErr) throw insErr;

  await supabase
    .from('booking_expenses')
    .update({ pushed_budget_item_id: inserted.id })
    .eq('id', expense.id);

  return inserted.id;
}

export async function unlinkExpenseFromBudget(expense: BookingExpense): Promise<void> {
  if (!expense.pushed_budget_item_id) return;
  await supabase
    .from('budget_items')
    .delete()
    .eq('id', expense.pushed_budget_item_id);
  await supabase
    .from('booking_expenses')
    .update({ pushed_budget_item_id: null })
    .eq('id', expense.id);
}

// ─── Subida de factura al bucket "facturas" ──────────────────────────
export async function uploadInvoiceFile(
  file: File,
  bookingId: string,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const path = `imprevistos/${bookingId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from('facturas')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('facturas').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Helpers de presentación ─────────────────────────────────────────
export function formatShareSummary(e: BookingExpense): string {
  if (e.split_mode === 'single') {
    const labels: Record<ExpensePayer, string> = {
      promoter: 'Promotor',
      agency: 'Agencia',
      artist: 'Artista',
    };
    return labels[e.payer];
  }
  const parts: string[] = [];
  if (e.split_promoter_pct > 0) parts.push(`P ${e.split_promoter_pct}%`);
  if (e.split_agency_pct   > 0) parts.push(`A ${e.split_agency_pct}%`);
  if (e.split_artist_pct   > 0) parts.push(`Ar ${e.split_artist_pct}%`);
  return parts.join(' · ');
}

export { getCategoryLabel };
