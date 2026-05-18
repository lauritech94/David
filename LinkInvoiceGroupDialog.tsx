import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
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
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link2, Unlink, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Validación estricta del Nº de factura del proveedor.
 * - Trim, max 64
 * - Caracteres permitidos: alfanuméricos + separadores típicos de numeración fiscal
 */
const InvoiceNumberSchema = z
  .string()
  .trim()
  .min(1, 'El número de factura es obligatorio')
  .max(64, 'Máximo 64 caracteres')
  .regex(/^[A-Za-z0-9 _\-\/.]+$/, 'Solo letras, números y caracteres . - / _');

const InvoiceTotalSchema = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .nonnegative('No puede ser negativo')
  .max(1_000_000, 'Importe demasiado alto')
  .nullable();

interface CandidateLine {
  id: string;
  name: string;
  category: string;
  amount: number;
  supplier_invoice_number: string | null;
  supplier_invoice_total: number | null;
  invoice_link: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Línea que se está agrupando (la "hija") */
  itemId: string;
  itemName: string;
  itemAmount: number;
  /** Para limitar candidatos al mismo proveedor + presupuesto */
  budgetId: string;
  contactId: string | null;
  contactName?: string;
  onLinked: () => void;
}

export function LinkInvoiceGroupDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  itemAmount,
  budgetId,
  contactId,
  contactName,
  onLinked,
}: Props) {
  const [candidates, setCandidates] = useState<CandidateLine[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [newInvoiceTotal, setNewInvoiceTotal] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar facturas existentes del mismo proveedor en este presupuesto
  useEffect(() => {
    if (!open || !contactId) return;
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('budget_items')
          .select('id, name, category, quantity, unit_price, supplier_invoice_number, supplier_invoice_total, invoice_link, invoice_group_parent_id')
          .eq('budget_id', budgetId)
          .eq('contact_id', contactId)
          .is('invoice_group_parent_id', null)
          .neq('id', itemId)
          .not('supplier_invoice_number', 'is', null);

        if (error) throw error;
        const list: CandidateLine[] = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          amount: Number(r.quantity || 1) * Number(r.unit_price || 0),
          supplier_invoice_number: r.supplier_invoice_number,
          supplier_invoice_total: r.supplier_invoice_total,
          invoice_link: r.invoice_link,
        }));
        setCandidates(list);
        if (list.length === 0) setMode('new');
      } catch (e) {
        console.error('Error cargando facturas existentes:', e);
        toast.error('No se pudieron cargar las facturas existentes');
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [open, contactId, budgetId, itemId]);

  const selectedParent = useMemo(
    () => candidates.find((c) => c.id === selectedParentId),
    [candidates, selectedParentId]
  );

  const handleSubmit = async () => {
    setErrors({});
    if (!contactId) {
      toast.error('Esta partida no tiene proveedor asignado');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'existing') {
        if (!selectedParentId) {
          setErrors({ parent: 'Selecciona una factura' });
          setSubmitting(false);
          return;
        }
        // Marcar esta línea como agrupada bajo la principal
        const { error } = await (supabase as any)
          .from('budget_items')
          .update({
            invoice_group_parent_id: selectedParentId,
            billing_status: 'agrupada',
            supplier_invoice_number: selectedParent?.supplier_invoice_number,
            invoice_link: selectedParent?.invoice_link,
          })
          .eq('id', itemId);
        if (error) throw error;
        toast.success(`Línea agrupada en factura ${selectedParent?.supplier_invoice_number}`);
      } else {
        // Crear/registrar nueva factura: esta línea queda como principal
        const numberResult = InvoiceNumberSchema.safeParse(newInvoiceNumber);
        if (!numberResult.success) {
          setErrors({ number: numberResult.error.issues[0].message });
          setSubmitting(false);
          return;
        }
        const totalParsed = newInvoiceTotal.trim() === '' ? null : Number(newInvoiceTotal.replace(',', '.'));
        const totalResult = InvoiceTotalSchema.safeParse(totalParsed);
        if (!totalResult.success) {
          setErrors({ total: totalResult.error.issues[0].message });
          setSubmitting(false);
          return;
        }

        const { error } = await (supabase as any)
          .from('budget_items')
          .update({
            supplier_invoice_number: numberResult.data,
            supplier_invoice_total: totalResult.data,
            // No tocamos billing_status aquí: queda como esté (principal)
          })
          .eq('id', itemId);
        if (error) throw error;
        toast.success(`Factura ${numberResult.data} registrada en esta línea`);
      }
      onLinked();
      onOpenChange(false);
      setSelectedParentId('');
      setNewInvoiceNumber('');
      setNewInvoiceTotal('');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error al agrupar la línea');
    } finally {
      setSubmitting(false);
    }
  };

  // Validación visual del cuadre cuando se elige factura existente
  const cuadreInfo = useMemo(() => {
    if (mode !== 'existing' || !selectedParent) return null;
    const total = selectedParent.supplier_invoice_total;
    if (!total) return null;
    const sumaActual = selectedParent.amount; // se ampliará al añadir esta línea
    const sumaConEsta = sumaActual + itemAmount;
    const diff = Math.abs(sumaConEsta - total);
    if (diff < 0.01) {
      return { ok: true, msg: `La suma cuadra con el total de la factura (${total.toFixed(2)} €)` };
    }
    return {
      ok: false,
      msg: `La suma de líneas tras agrupar (${sumaConEsta.toFixed(2)} €) no coincide con el total de la factura (${total.toFixed(2)} €)`,
    };
  }, [mode, selectedParent, itemAmount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Agrupar en factura
          </DialogTitle>
          <DialogDescription>
            Vincula esta línea a una factura del proveedor que ya contiene varios conceptos.
            Evita marcar la misma factura dos veces y previene pagos duplicados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">Línea a agrupar</div>
            <div className="font-medium">{itemName}</div>
            <div className="text-sm flex items-center gap-2 mt-1">
              <Badge variant="outline">{contactName || 'Sin proveedor'}</Badge>
              <span className="font-mono">{itemAmount.toFixed(2)} €</span>
            </div>
          </div>

          {!contactId && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>Asigna primero un proveedor a esta línea para poder agruparla.</div>
            </div>
          )}

          {contactId && (
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-3">
              {/* Opción 1: agrupar en factura existente */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="existing" id="opt-existing" disabled={candidates.length === 0} />
                  <Label htmlFor="opt-existing" className="font-medium">
                    Agrupar en una factura ya registrada
                    <span className="text-muted-foreground font-normal ml-2">
                      ({candidates.length} disponible{candidates.length === 1 ? '' : 's'} para {contactName || 'este proveedor'})
                    </span>
                  </Label>
                </div>

                {mode === 'existing' && (
                  <div className="ml-6 space-y-2">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                      </div>
                    ) : candidates.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No hay facturas registradas para este proveedor en este presupuesto.
                      </div>
                    ) : (
                      <RadioGroup value={selectedParentId} onValueChange={setSelectedParentId} className="space-y-1">
                        {candidates.map((c) => (
                          <label
                            key={c.id}
                            htmlFor={`cand-${c.id}`}
                            className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                          >
                            <RadioGroupItem value={c.id} id={`cand-${c.id}`} />
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-mono text-sm">{c.supplier_invoice_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.name} · {c.category} · {c.amount.toFixed(2)} €
                                {c.supplier_invoice_total
                                  ? ` · Total factura: ${c.supplier_invoice_total.toFixed(2)} €`
                                  : ''}
                              </div>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                    {errors.parent && <p className="text-xs text-destructive">{errors.parent}</p>}
                    {cuadreInfo && (
                      <div
                        className={`text-xs rounded-md p-2 ${
                          cuadreInfo.ok
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {cuadreInfo.msg}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Opción 2: registrar factura nueva en esta línea */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="new" id="opt-new" />
                  <Label htmlFor="opt-new" className="font-medium">
                    Registrar el Nº de factura en esta línea (será la línea principal)
                  </Label>
                </div>
                {mode === 'new' && (
                  <div className="ml-6 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="inv-num" className="text-xs">Nº factura del proveedor</Label>
                      <Input
                        id="inv-num"
                        placeholder="Ej. 2026/A-117"
                        value={newInvoiceNumber}
                        onChange={(e) => setNewInvoiceNumber(e.target.value)}
                        maxLength={64}
                      />
                      {errors.number && <p className="text-xs text-destructive">{errors.number}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="inv-total" className="text-xs">
                        Importe total documento (opcional)
                      </Label>
                      <Input
                        id="inv-total"
                        placeholder="550.00"
                        inputMode="decimal"
                        value={newInvoiceTotal}
                        onChange={(e) => setNewInvoiceTotal(e.target.value)}
                      />
                      {errors.total && <p className="text-xs text-destructive">{errors.total}</p>}
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">
                      Después podrás agrupar otras partidas (de cualquier categoría) bajo esta misma factura desde su menú.
                    </p>
                  </div>
                )}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !contactId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'existing' ? 'Agrupar en factura' : 'Registrar factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UnlinkProps {
  itemId: string;
  invoiceNumber?: string | null;
  onDone: () => void;
}

export async function unlinkFromInvoiceGroup({ itemId, onDone }: UnlinkProps) {
  try {
    const { error } = await (supabase as any)
      .from('budget_items')
      .update({
        invoice_group_parent_id: null,
        billing_status: 'pendiente',
        supplier_invoice_number: null,
        invoice_link: null,
      })
      .eq('id', itemId);
    if (error) throw error;
    toast.success('Línea desagrupada de la factura');
    onDone();
  } catch (e: any) {
    console.error(e);
    toast.error(e?.message || 'Error al desagrupar');
  }
}
