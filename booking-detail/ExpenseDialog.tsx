import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, FileText, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { EXPENSE_CATEGORIES } from '@/lib/booking/expenseCategories';
import {
  expenseInputSchema,
  uploadInvoiceFile,
  computeShares,
  type ExpenseInput,
  type BookingExpense,
} from '@/lib/booking/expenses';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  defaultDate?: string | null;
  initial?: BookingExpense | null;
  onSubmit: (input: ExpenseInput) => Promise<void>;
}

const PAYERS: { value: 'agency' | 'promoter' | 'artist'; label: string }[] = [
  { value: 'agency', label: 'Agencia' },
  { value: 'promoter', label: 'Promotor' },
  { value: 'artist', label: 'Artista' },
];

function buildDefaults(
  defaultDate: string | null | undefined,
  initial: BookingExpense | null | undefined,
): ExpenseInput {
  if (initial) {
    return {
      description: initial.description ?? '',
      category: initial.category ?? 'otros',
      amount: Number(initial.amount) || 0,
      iva_percentage: Number(initial.iva_percentage) || 0,
      irpf_percentage: Number(initial.irpf_percentage) || 0,
      other_tax_percentage: Number(initial.other_tax_percentage) || 0,
      other_tax_label: initial.other_tax_label ?? null,
      handler: (initial.handler as any) || 'agency',
      payer: (initial.payer as any) || 'promoter',
      expense_date: initial.expense_date || defaultDate || new Date().toISOString().slice(0, 10),
      invoice_url: initial.invoice_url ?? null,
      invoice_number: initial.invoice_number ?? null,
      split_mode: initial.split_mode || 'single',
      split_promoter_pct: Number(initial.split_promoter_pct) || 0,
      split_agency_pct: Number(initial.split_agency_pct) || 0,
      split_artist_pct: Number(initial.split_artist_pct) || 0,
      push_to_budget: !!initial.pushed_budget_item_id,
    };
  }
  return {
    description: '',
    category: 'otros',
    amount: 0,
    iva_percentage: 21,
    irpf_percentage: 0,
    other_tax_percentage: 0,
    other_tax_label: null,
    handler: 'agency',
    payer: 'promoter',
    expense_date: defaultDate || new Date().toISOString().slice(0, 10),
    invoice_url: null,
    invoice_number: null,
    split_mode: 'single',
    split_promoter_pct: 0,
    split_agency_pct: 0,
    split_artist_pct: 0,
    push_to_budget: false,
  };
}

export function ExpenseDialog({
  open,
  onOpenChange,
  bookingId,
  defaultDate,
  initial,
  onSubmit,
}: ExpenseDialogProps) {
  const [form, setForm] = useState<ExpenseInput>(() => buildDefaults(defaultDate, initial));
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setForm(buildDefaults(defaultDate, initial));
  }, [open, initial, defaultDate]);

  const set = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const splitTotal = useMemo(
    () =>
      Math.round(
        (form.split_promoter_pct + form.split_agency_pct + form.split_artist_pct) * 100,
      ) / 100,
    [form.split_promoter_pct, form.split_agency_pct, form.split_artist_pct],
  );

  const shares = useMemo(
    () => computeShares({
      amount: form.amount,
      payer: form.payer,
      split_mode: form.split_mode,
      split_promoter_pct: form.split_promoter_pct,
      split_agency_pct: form.split_agency_pct,
      split_artist_pct: form.split_artist_pct,
    }),
    [form],
  );
  const artistAmount = shares.artist;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadInvoiceFile(file, bookingId);
      set('invoice_url', url);
      toast.success('Factura subida');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo subir la factura');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const parsed = expenseInputSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Datos inválidos');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar el imprevisto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar imprevisto' : 'Añadir imprevisto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción *</Label>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ej: Cena equipo técnico"
              maxLength={200}
            />
          </div>

          {/* Categoría + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha del gasto</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => set('expense_date', e.target.value)}
              />
            </div>
          </div>

          {/* Importe + impuestos */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Importe (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>IVA (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.iva_percentage}
                onChange={(e) => set('iva_percentage', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>IRPF (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.irpf_percentage}
                onChange={(e) => set('irpf_percentage', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Otro impuesto opcional */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Otro impuesto (etiqueta)</Label>
              <Input
                value={form.other_tax_label ?? ''}
                onChange={(e) => set('other_tax_label', e.target.value || null)}
                placeholder="Ej: Recargo equivalencia"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Porcentaje (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.other_tax_percentage}
                onChange={(e) => set('other_tax_percentage', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Factura adjunta */}
          <div className="space-y-2">
            <Label>Factura / ticket</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {form.invoice_url ? (
                <>
                  <a
                    href={form.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> Ver adjunto <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set('invoice_url', null)}
                  >
                    <X className="h-4 w-4 mr-1" /> Quitar
                  </Button>
                </>
              ) : (
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded-md px-3 py-1.5 hover:bg-muted">
                  {uploading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  Subir archivo
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              <Input
                className="max-w-[180px]"
                value={form.invoice_number ?? ''}
                onChange={(e) => set('invoice_number', e.target.value || null)}
                placeholder="Nº factura (opcional)"
                maxLength={60}
              />
            </div>
          </div>

          {/* Quién paga */}
          <div className="space-y-2">
            <Label>¿Quién paga?</Label>
            <Tabs
              value={form.split_mode}
              onValueChange={(v) => set('split_mode', v as 'single' | 'split')}
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="single">Un único pagador</TabsTrigger>
                <TabsTrigger value="split">Dividir el gasto</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pagador</Label>
                    <Select value={form.payer} onValueChange={(v) => set('payer', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gestiona</Label>
                    <Select value={form.handler} onValueChange={(v) => set('handler', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="split" className="pt-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Promotor %</Label>
                    <Input
                      type="number"
                      value={form.split_promoter_pct}
                      onChange={(e) => set('split_promoter_pct', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {shares.promoter.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Agencia %</Label>
                    <Input
                      type="number"
                      value={form.split_agency_pct}
                      onChange={(e) => set('split_agency_pct', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {shares.agency.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Artista %</Label>
                    <Input
                      type="number"
                      value={form.split_artist_pct}
                      onChange={(e) => set('split_artist_pct', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {shares.artist.toFixed(2)} €
                    </p>
                  </div>
                </div>
                <p
                  className={`text-xs ${
                    splitTotal === 100 ? 'text-muted-foreground' : 'text-destructive'
                  }`}
                >
                  Suma: {splitTotal}% {splitTotal !== 100 && '— debe ser 100%'}
                </p>
                <div className="space-y-2">
                  <Label>Gestiona</Label>
                  <Select value={form.handler} onValueChange={(v) => set('handler', v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Push al presupuesto del artista */}
          {artistAmount > 0 && (
            <div className="rounded-md border p-3 bg-muted/30 flex items-start gap-3">
              <Checkbox
                id="push-to-budget"
                checked={form.push_to_budget}
                onCheckedChange={(v) => set('push_to_budget', !!v)}
              />
              <div className="space-y-0.5">
                <label htmlFor="push-to-budget" className="text-sm font-medium cursor-pointer">
                  Añadir la parte del artista al presupuesto del evento
                </label>
                <p className="text-xs text-muted-foreground">
                  Se añadirá una partida de <strong>{artistAmount.toFixed(2)} €</strong> en
                  el presupuesto principal del booking.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? 'Guardar' : 'Añadir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
