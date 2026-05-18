import { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FileText,
  Loader2,
  Search,
  Paperclip,
  AlertTriangle,
  Link2,
  Files,
  Pencil,
  Sparkles,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { isPaidStatus } from '@/lib/billingStatus';
import { InvoiceExtractionPanel } from './InvoiceExtractionPanel';
import { BudgetContactSelector, type ContactPrefill } from './BudgetContactSelector';
import {
  scoreMatch,
  matchClassColor,
  matchClassLabel,
  issuerMatchesItemContact,
  type ExtractedInvoice,
  type MatchResult,
} from '@/lib/invoiceMatching';

interface AttachableItem {
  id: string;
  name: string;
  category: string;
  quantity?: number;
  unit_price?: number;
  invoice_link?: string | null;
  billing_status?: string | null;
  invoice_group_parent_id?: string | null;
  supplier_invoice_number?: string | null;
  contacts?: { id?: string; name?: string | null } | null;
}

interface BudgetCategoryOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  items: AttachableItem[];
  onLinked: () => void;
  budgetId?: string;
  categories?: BudgetCategoryOption[];
  hiddenCategoryIds?: Set<string>;
  onUnhideCategory?: (categoryId: string) => void;
}

const isItemPaid = (item: AttachableItem) => isPaidStatus(item.billing_status);
const isItemGrouped = (item: AttachableItem) =>
  !!item.invoice_group_parent_id || item.billing_status === 'agrupada';

// Validación reutilizada del LinkInvoiceGroupDialog
const validateInvoiceNumber = (n: string): string | null => {
  const t = n.trim();
  if (!t) return 'El número de factura es obligatorio';
  if (t.length > 64) return 'Máximo 64 caracteres';
  if (!/^[A-Za-z0-9 _\-\/.]+$/.test(t)) return 'Solo letras, números y . - / _';
  return null;
};

type Mode = 'choose' | 'group' | 'separate';

export function AttachInvoiceToItemDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  items,
  onLinked,
  budgetId,
  categories = [],
  hiddenCategoryIds,
  onUnhideCategory,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [hideBlocked, setHideBlocked] = useState(false);

  // Sub-flow state
  const [chooseModeOpen, setChooseModeOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [numberAutofilled, setNumberAutofilled] = useState(false);
  const [totalAutofilled, setTotalAutofilled] = useState(false);
  const [unlockedNumber, setUnlockedNumber] = useState(false);
  const [unlockedTotal, setUnlockedTotal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Category picker for "generate from invoice"
  const [pickCategoryOpen, setPickCategoryOpen] = useState(false);
  const [chosenCategoryId, setChosenCategoryId] = useState<string | null>(null);
  // Contact assignment for "generate from invoice"
  const [chosenContactId, setChosenContactId] = useState<string | null>(null);

  // ---- AI Extraction state ----
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ExtractedInvoice | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [issuerContact, setIssuerContact] = useState<any>(null);
  const [autoSelected, setAutoSelected] = useState(false);

  const runExtraction = async () => {
    if (!fileUrl) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const { data, error } = await supabase.functions.invoke('extract-invoice-data', {
        body: { fileUrl },
      });
      if (error) throw new Error(error.message || 'Error');
      if ((data as any)?.error) throw new Error((data as any).error);
      setExtraction((data as any).extraction as ExtractedInvoice);
    } catch (e: any) {
      console.error(e);
      setExtractError(e?.message || 'Error de extracción');
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearch('');
      setChooseModeOpen(false);
      setMode('choose');
      setInvoiceNumber('');
      setInvoiceTotal('');
      setNumberAutofilled(false);
      setTotalAutofilled(false);
      setUnlockedNumber(false);
      setUnlockedTotal(false);
      setErrorMsg(null);
      setPickCategoryOpen(false);
      setChosenCategoryId(null);
      setChosenContactId(null);
      setExtraction(null);
      setExtractError(null);
      setExtracting(false);
      setIssuerContact(null);
      setAutoSelected(false);
      return;
    }
    void runExtraction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fileUrl]);

  // Compute match results per item
  const matches = useMemo(() => {
    const map = new Map<string, MatchResult>();
    if (!extraction) return map;
    const issuerName = extraction.issuer?.name;
    items.forEach((it) => {
      const issuerMatches = issuerMatchesItemContact(issuerName, it.contacts?.name);
      map.set(it.id, scoreMatch(it, extraction, issuerMatches));
    });
    return map;
  }, [extraction, items]);

  const hasAnyMatch = useMemo(() => {
    for (const m of matches.values()) {
      if (m.klass === 'exact' || m.klass === 'likely') return true;
    }
    return false;
  }, [matches]);

  const canCreateFromInvoice =
    !!budgetId && !!extraction?.lines?.length && !hasAnyMatch;

  // Auto-fill invoice number/total when extraction arrives
  useEffect(() => {
    if (!extraction) return;
    if (!invoiceNumber && extraction.invoice?.number) {
      setInvoiceNumber(extraction.invoice.number);
      setNumberAutofilled(true);
    }
    if (!invoiceTotal && extraction.invoice?.total != null) {
      setInvoiceTotal(String(extraction.invoice.total));
      setTotalAutofilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraction]);

  // Auto-pre-select likely/exact matches once
  useEffect(() => {
    if (!extraction || autoSelected || matches.size === 0) return;
    const preSelect = new Set<string>();
    items.forEach((it) => {
      const m = matches.get(it.id);
      if (m && (m.klass === 'exact' || m.klass === 'likely')) preSelect.add(it.id);
    });
    if (preSelect.size > 0) {
      setSelectedIds(preSelect);
      // If extracted invoice has multiple lines, suggest group mode
      if ((extraction.lines?.length || 0) > 1 && preSelect.size > 1) {
        // pre-arm group mode but don't open the modal yet — happens when user clicks "Continuar"
      }
    }
    setAutoSelected(true);
  }, [extraction, matches, items, autoSelected]);

  // Try to find the issuer contact in the workspace by name (best-effort)
  useEffect(() => {
    const issuerName = extraction?.issuer?.name;
    if (!issuerName) { setIssuerContact(null); return; }
    // Prefer a contact already attached to one of the budget items
    const fromItems = items.find((it) => issuerMatchesItemContact(issuerName, it.contacts?.name))?.contacts;
    if (fromItems && (fromItems as any).id) {
      supabase.from('contacts').select('id,name,email,phone,address,iban,legal_name')
        .eq('id', (fromItems as any).id).maybeSingle()
        .then(({ data }) => setIssuerContact(data));
      return;
    }
    // Otherwise, search by name
    supabase.from('contacts').select('id,name,email,phone,address,iban,legal_name')
      .ilike('name', `%${issuerName}%`).limit(1).maybeSingle()
      .then(({ data }) => setIssuerContact(data));
  }, [extraction, items]);

  // Default chosen contact = matched issuer contact (only when user hasn't picked yet)
  useEffect(() => {
    if (issuerContact?.id && !chosenContactId) {
      setChosenContactId(issuerContact.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuerContact]);

  // Build prefill data for "create new contact" from the extracted issuer
  const contactPrefill: ContactPrefill | null = useMemo(() => {
    const i = extraction?.issuer;
    if (!i || !i.name) return null;
    return {
      name: i.name,
      email: i.email || null,
      legal_name: i.legal_name || null,
      tax_id: i.tax_id || null,
      phone: i.phone || null,
      address: i.address || null,
      iban: i.iban || null,
      website: i.website || null,
    };
  }, [extraction]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let arr = items
      .filter((i) => !hideBlocked || (!i.invoice_link && !isItemPaid(i) && !isItemGrouped(i)))
      .filter((i) => {
        if (!term) return true;
        const haystack = [i.name, i.category, i.contacts?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    // Sort by match score desc when available
    if (matches.size > 0) {
      arr = [...arr].sort((a, b) => (matches.get(b.id)?.score ?? 0) - (matches.get(a.id)?.score ?? 0));
    }
    return arr;
  }, [items, search, hideBlocked, matches]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  const totalSelected = useMemo(
    () =>
      selectedItems.reduce(
        (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
        0
      ),
    [selectedItems]
  );

  const anyPaidOrLinked = selectedItems.some(
    (i) => isItemPaid(i) || !!i.invoice_link
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ----- Acciones -----

  const performSeparate = async () => {
    setSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('budget_items')
        .update({ invoice_link: fileUrl })
        .in('id', ids);
      if (error) throw error;

      toast({
        title:
          ids.length === 1
            ? 'Factura vinculada'
            : `Factura vinculada a ${ids.length} líneas`,
        description: fileName,
      });
      onLinked();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'No se pudo vincular',
        description: e?.message || 'Error al actualizar las líneas',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setChooseModeOpen(false);
      setMode('choose');
    }
  };

  const performGroup = async () => {
    setErrorMsg(null);
    const numberErr = validateInvoiceNumber(invoiceNumber);
    if (numberErr) {
      setErrorMsg(numberErr);
      return;
    }
    let totalParsed: number | null = null;
    if (invoiceTotal.trim() !== '') {
      const n = Number(invoiceTotal.replace(',', '.'));
      if (!isFinite(n) || n < 0) {
        setErrorMsg('Importe total no válido');
        return;
      }
      totalParsed = n;
    }

    setSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      // Principal = primera línea seleccionada (en orden de aparición)
      const principalId =
        items.find((i) => selectedIds.has(i.id))?.id || ids[0];
      const childIds = ids.filter((id) => id !== principalId);

      // 1) Principal: número, total, link, estado factura recibida si estaba pendiente
      const { error: e1 } = await supabase
        .from('budget_items')
        .update({
          invoice_link: fileUrl,
          supplier_invoice_number: invoiceNumber.trim(),
          supplier_invoice_total: totalParsed,
          invoice_group_parent_id: null,
        })
        .eq('id', principalId);
      if (e1) throw e1;

      // 2) Hijas: agrupadas
      if (childIds.length > 0) {
        const { error: e2 } = await supabase
          .from('budget_items')
          .update({
            invoice_group_parent_id: principalId,
            billing_status: 'agrupada',
            supplier_invoice_number: invoiceNumber.trim(),
            invoice_link: fileUrl,
          })
          .in('id', childIds);
        if (e2) throw e2;
      }

      toast({
        title: 'Factura agrupada',
        description: `${ids.length} líneas comparten ahora la factura ${invoiceNumber.trim()}.`,
      });
      onLinked();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'No se pudo agrupar',
        description: e?.message || 'Error al agrupar las líneas',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setChooseModeOpen(false);
      setMode('choose');
    }
  };

  const performCreateLines = async (categoryOverride?: BudgetCategoryOption) => {
    if (!budgetId || !extraction?.lines?.length) return;
    setSubmitting(true);
    try {
      // Resolve target category
      let targetCategoryName: string;
      let targetCategoryId: string | null = null;
      if (categoryOverride) {
        targetCategoryName = categoryOverride.name;
        targetCategoryId = categoryOverride.id;
        // Auto-unhide if hidden
        if (hiddenCategoryIds?.has(categoryOverride.id) && onUnhideCategory) {
          onUnhideCategory(categoryOverride.id);
          toast({
            title: 'Categoría ahora visible',
            description: `"${categoryOverride.name}" se ha mostrado para incluir las nuevas líneas.`,
          });
        }
      } else {
        targetCategoryName = items[0]?.category || 'Otros';
      }

      const contactId = chosenContactId ?? issuerContact?.id ?? null;
      const number = (invoiceNumber || extraction.invoice?.number || '').trim();
      const totalDoc =
        invoiceTotal.trim() !== ''
          ? Number(invoiceTotal.replace(',', '.'))
          : (extraction.invoice?.total ?? null);

      // Normalize issue date (YYYY-MM-DD); fallback to null
      const issueDateRaw = extraction.invoice?.date || null;
      const issueDate = issueDateRaw && /^\d{4}-\d{2}-\d{2}/.test(issueDateRaw)
        ? issueDateRaw.slice(0, 10)
        : null;
      const providerEmail = extraction.issuer?.email?.trim() || null;
      const receivedAt = new Date().toISOString();

      // Compose observations with notes / due date if present
      const obsParts: string[] = [];
      if (extraction.invoice?.due_date) obsParts.push(`Vence: ${extraction.invoice.due_date}`);
      if (extraction.notes) obsParts.push(extraction.notes.trim());
      const observations = obsParts.length ? obsParts.join(' · ').slice(0, 500) : null;

      // sort_order: max + 1
      const { data: maxRow } = await supabase
        .from('budget_items')
        .select('sort_order')
        .eq('budget_id', budgetId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      let nextOrder = ((maxRow?.sort_order as number | null) ?? -1) + 1;

      const linesPayload = extraction.lines.map((l) => {
        const qty = Number(l.quantity) || 1;
        const unit = qty > 0 ? Number(l.total) / qty : Number(l.total);
        return {
          budget_id: budgetId,
          category: targetCategoryName,
          ...(targetCategoryId ? { category_id: targetCategoryId } : {}),
          name: l.description?.slice(0, 200) || 'Concepto factura',
          quantity: qty,
          unit_price: Number(unit.toFixed(2)),
          iva_percentage: Number(l.iva_pct) || 0,
          irpf_percentage: extraction.invoice?.irpf_pct || 0,
          billing_status: 'pendiente' as any,
          contact_id: contactId,
          invoice_link: fileUrl,
          sort_order: nextOrder++,
          fecha_emision: issueDate,
          provider_email: providerEmail,
          provider_invoice_received_at: receivedAt,
          provider_invoice_status: 'received',
          observations,
        };
      });

      // Insert principal first (so we have its id for grouping)
      const principalPayload = {
        ...linesPayload[0],
        supplier_invoice_number: number || null,
        supplier_invoice_total: totalDoc,
      };
      const { data: principalRow, error: ePrincipal } = await supabase
        .from('budget_items')
        .insert(principalPayload as any)
        .select('id')
        .single();
      if (ePrincipal) throw ePrincipal;

      if (linesPayload.length > 1) {
        const children = linesPayload.slice(1).map((p) => ({
          ...p,
          billing_status: 'agrupada' as any,
          invoice_group_parent_id: principalRow!.id,
          supplier_invoice_number: number || null,
        }));
        const { error: eChildren } = await supabase
          .from('budget_items')
          .insert(children as any);
        if (eChildren) throw eChildren;
      }

      toast({
        title:
          linesPayload.length === 1
            ? 'Línea creada desde la factura'
            : `${linesPayload.length} líneas creadas desde la factura`,
        description: number
          ? `Factura ${number} vinculada al presupuesto.`
          : fileName,
      });
      onLinked();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'No se pudieron crear las líneas',
        description: e?.message || 'Error al insertar',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttach = () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size === 1) {
      // Caso simple: si está pagada / ya tiene factura, abrimos el modal de aviso
      // (mantenemos el flujo de confirmación) reutilizando el sub-modal.
      if (anyPaidOrLinked) {
        setMode('separate');
        setChooseModeOpen(true);
        return;
      }
      void performSeparate();
      return;
    }
    // 2+ líneas → abrir modal con elección agrupar / separar
    setMode('choose');
    setChooseModeOpen(true);
  };

  // Cuadre informativo para "agrupar"
  const cuadreInfo = useMemo(() => {
    if (mode !== 'group') return null;
    if (invoiceTotal.trim() === '') return null;
    const total = Number(invoiceTotal.replace(',', '.'));
    if (!isFinite(total)) return null;
    const diff = Math.abs(totalSelected - total);
    if (diff < 0.01) {
      return { ok: true, msg: `La suma cuadra con el total (${total.toFixed(2)} €)` };
    }
    return {
      ok: false,
      msg: `Suma de líneas: ${totalSelected.toFixed(2)} € · Total factura: ${total.toFixed(2)} € (diferencia ${(totalSelected - total).toFixed(2)} €)`,
    };
  }, [mode, invoiceTotal, totalSelected]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Vincular factura a una o varias líneas
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{fileName}</span> se subió al Drive pero aún
              no está vinculada a ninguna partida del presupuesto. Marca todas las líneas
              que cubre esta factura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-y-auto px-6 py-1">
            <InvoiceExtractionPanel
              loading={extracting}
              error={extractError}
              extraction={extraction}
              issuerContact={issuerContact}
              onRetry={() => void runExtraction()}
            />

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto, categoría o proveedor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filtered.length} línea(s) · {selectedIds.size} seleccionada(s)
                {selectedIds.size > 0 && ` · ${totalSelected.toFixed(2)} €`}
              </span>
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => setHideBlocked((v) => !v)}
              >
                {hideBlocked
                  ? 'Mostrar también las pagadas / con factura'
                  : 'Ocultar las pagadas / con factura'}
              </button>
            </div>

            <ScrollArea className="h-[320px] rounded-md border">
              <div className="p-1">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No hay líneas que coincidan con la búsqueda.
                  </div>
                ) : (
                  filtered.map((item) => {
                    const total =
                      (Number(item.quantity) || 1) * (Number(item.unit_price) || 0);
                    const checked = selectedIds.has(item.id);
                    const paid = isItemPaid(item);
                    const grouped = isItemGrouped(item);
                    const hasInvoice = !!item.invoice_link;
                    const matchRes = matches.get(item.id);
                    return (
                      <label
                        key={item.id}
                        htmlFor={`pick-${item.id}`}
                        className={`w-full text-left flex items-center gap-3 p-2 rounded-md border mb-1 cursor-pointer transition-colors ${
                          checked
                            ? 'border-primary bg-primary/5'
                            : matchRes && matchRes.klass === 'exact'
                            ? 'border-emerald-500/40 hover:bg-emerald-500/5'
                            : 'border-transparent hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          id={`pick-${item.id}`}
                          checked={checked}
                          onCheckedChange={() => toggle(item.id)}
                        />
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-2 flex-wrap">
                            <span className="truncate">{item.name}</span>
                            {grouped && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 shrink-0"
                                title="Esta línea ya forma parte de una factura agrupada — no la pagues por separado."
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Agrupada{item.supplier_invoice_number ? ` · ${item.supplier_invoice_number}` : ''}
                              </Badge>
                            )}
                            {paid && !grouped && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 shrink-0"
                              >
                                Ya pagada
                              </Badge>
                            )}
                            {hasInvoice && !paid && !grouped && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                Ya tiene factura
                              </Badge>
                            )}
                            {matchRes && matchRes.klass !== 'none' && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${matchClassColor(matchRes.klass)}`}
                                title={matchRes.reason}
                              >
                                {matchClassLabel(matchRes.klass)}
                                {matchRes.klass === 'amount_mismatch' && Math.abs(matchRes.amountDelta) > 0.01 && (
                                  <span className="ml-1 font-mono">
                                    {matchRes.amountDelta >= 0 ? '+' : ''}{matchRes.amountDelta.toFixed(2)}€
                                  </span>
                                )}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.category}
                            {item.contacts?.name ? ` · ${item.contacts.name}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm">{total.toFixed(2)} €</div>
                          {hasInvoice && paid && !grouped && (
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                              factura + pagada
                            </Badge>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {selectedIds.size >= 2 && (
              <div className="flex items-start gap-2 rounded-md border border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-100">
                <Files className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  Has marcado <strong>{selectedIds.size} líneas</strong>. Al continuar te
                  preguntaremos si quieres <strong>agruparlas en una sola factura</strong>{' '}
                  (recomendado, evita pagar dos veces) o vincular el mismo PDF a cada línea
                  por separado.
                </div>
              </div>
            )}

            {selectedIds.size === 1 && anyPaidOrLinked && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  Esta partida ya consta como pagada o ya tiene una factura vinculada.
                  Puedes vincular esta nueva factura igualmente — sustituirá el enlace
                  anterior.
                </div>
              </div>
            )}

            {selectedIds.size === 0 && canCreateFromInvoice && (
              <div className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
                <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <div>
                  Ninguna partida del presupuesto coincide con esta factura.
                  Puedes <strong>generar {extraction!.lines.length === 1 ? 'una nueva línea' : `${extraction!.lines.length} nuevas líneas`} a partir de los conceptos detectados</strong>,
                  con el proveedor, IVA e importes ya rellenados.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-3 border-t bg-background">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            {selectedIds.size === 0 && canCreateFromInvoice ? (
              <Button
                onClick={() => {
                  // Pick a sensible default: first visible category, else first
                  const visibleFirst = categories.find(
                    (c) => !hiddenCategoryIds?.has(c.id),
                  );
                  const initial =
                    visibleFirst?.id || categories[0]?.id || null;
                  setChosenCategoryId(initial);
                  if (categories.length === 0) {
                    void performCreateLines();
                  } else {
                    setPickCategoryOpen(true);
                  }
                }}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Sparkles className="h-4 w-4 mr-2" />
                {extraction!.lines.length === 1
                  ? 'Generar nueva línea desde factura'
                  : `Generar ${extraction!.lines.length} líneas desde factura`}
              </Button>
            ) : (
              <Button
                onClick={handleAttach}
                disabled={selectedIds.size === 0 || submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedIds.size > 1
                  ? `Continuar con ${selectedIds.size} líneas`
                  : 'Vincular a esta línea'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-modal: elegir modo (agrupar vs separar) o confirmar reemplazo */}
      <AlertDialog open={chooseModeOpen} onOpenChange={setChooseModeOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedIds.size > 1 ? (
                <>
                  <Files className="h-5 w-5 text-primary" />
                  Esta factura cubre varios gastos
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Confirmar vinculación
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                {selectedIds.size > 1 ? (
                  <>
                    <p>
                      Has seleccionado <strong>{selectedIds.size} líneas</strong> (
                      {totalSelected.toFixed(2)} €). ¿Cómo quieres registrar la factura{' '}
                      <span className="font-medium">{fileName}</span>?
                    </p>

                    {mode === 'choose' && (
                      <div className="grid gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setMode('group')}
                          className="text-left rounded-md border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 p-3 transition-colors"
                        >
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-primary" />
                            Agrupar en una sola factura
                            <Badge className="ml-1 text-[10px]">Recomendado</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Las líneas comparten Nº de factura y enlace al PDF. El pago se
                            cuenta <strong>una sola vez</strong>. Evita duplicados.
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('separate')}
                          className="text-left rounded-md border hover:bg-muted/40 p-3 transition-colors"
                        >
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <Files className="h-4 w-4" />
                            Vincular el mismo PDF a cada línea por separado
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cada partida queda con su factura propia apuntando al mismo
                            archivo. Sólo si en realidad son facturas distintas archivadas
                            en un único PDF.
                          </p>
                        </button>
                      </div>
                    )}

                    {mode === 'group' && (
                      <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="grp-num" className="text-xs">
                              Nº factura del proveedor
                            </Label>
                            {numberAutofilled && !unlockedNumber && invoiceNumber ? (
                              <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="text-sm font-medium flex-1 truncate" title={invoiceNumber}>
                                  {invoiceNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setUnlockedNumber(true)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/60 transition-colors"
                                  title="Editar"
                                  aria-label="Editar número de factura"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <Input
                                id="grp-num"
                                placeholder="Ej. 2026/A-117"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                maxLength={64}
                                autoFocus={unlockedNumber}
                              />
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="grp-total" className="text-xs">
                              Importe total documento (opcional)
                            </Label>
                            {totalAutofilled && !unlockedTotal && invoiceTotal ? (
                              <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="text-sm font-medium font-mono flex-1 truncate">
                                  {Number(invoiceTotal.replace(',', '.')).toFixed(2)} €
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setUnlockedTotal(true)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/60 transition-colors"
                                  title="Editar"
                                  aria-label="Editar importe"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <Input
                                id="grp-total"
                                placeholder={totalSelected.toFixed(2)}
                                inputMode="decimal"
                                value={invoiceTotal}
                                onChange={(e) => setInvoiceTotal(e.target.value)}
                                autoFocus={unlockedTotal}
                              />
                            )}
                          </div>
                        </div>
                        {cuadreInfo && (
                          <div
                            className={`text-xs rounded-md p-2 ${
                              cuadreInfo.ok
                                ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30'
                            }`}
                          >
                            {cuadreInfo.msg}
                          </div>
                        )}
                        {errorMsg && (
                          <p className="text-xs text-destructive">{errorMsg}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          La primera línea seleccionada será la <strong>principal</strong>{' '}
                          (la que figurará como factura recibida). Las demás quedarán
                          marcadas como <em>agrupadas</em> con un indicador visual claro
                          para no pagarlas dos veces.
                        </p>
                      </div>
                    )}

                    {mode === 'separate' && (
                      <div className="rounded-md border p-3 bg-muted/20 text-xs text-muted-foreground">
                        Se vinculará el mismo PDF a las {selectedIds.size} líneas como
                        facturas independientes.
                        {anyPaidOrLinked && (
                          <p className="mt-2 text-amber-700 dark:text-amber-300">
                            Aviso: alguna línea ya consta como pagada o tenía una factura.
                            Se sustituirá su enlace.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p>
                    Esta partida ya consta como pagada o tiene una factura vinculada. ¿Quieres vincular{' '}
                    <span className="font-medium">{fileName}</span> de todos modos? Se
                    sustituirá el enlace anterior.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {selectedIds.size > 1 && mode !== 'choose' && (
              <Button
                variant="ghost"
                onClick={() => {
                  setMode('choose');
                  setErrorMsg(null);
                }}
                disabled={submitting}
              >
                ← Volver
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setChooseModeOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            {selectedIds.size > 1 && mode === 'choose' ? null : (
              <Button
                onClick={() => {
                  if (selectedIds.size > 1 && mode === 'group') void performGroup();
                  else void performSeparate();
                }}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedIds.size > 1 && mode === 'group'
                  ? 'Agrupar y vincular'
                  : selectedIds.size > 1
                  ? `Vincular por separado (${selectedIds.size})`
                  : 'Sí, vincular igualmente'}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category picker for "generate new lines from invoice" */}
      <AlertDialog open={pickCategoryOpen} onOpenChange={setPickCategoryOpen}>
        <AlertDialogContent className="max-w-lg p-0">
          <AlertDialogHeader className="px-6 pt-6">
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nueva{extraction?.lines && extraction.lines.length > 1 ? 's' : ''} línea{extraction?.lines && extraction.lines.length > 1 ? 's' : ''} desde la factura
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se crearán {extraction?.lines?.length || 0}{' '}
              {extraction?.lines?.length === 1 ? 'línea' : 'líneas'} con la fecha de
              emisión, IVA, IRPF e importes ya rellenados. Elige el contacto y la
              categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="px-6 py-3 max-h-[60vh] overflow-y-auto space-y-4">
            {/* Contact assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Asignar a contacto
                </Label>
                {issuerContact?.id && chosenContactId === issuerContact.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Detectado en la factura
                  </span>
                )}
                {!issuerContact?.id && contactPrefill?.name && !chosenContactId && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Sin coincidencia · crea uno nuevo
                  </span>
                )}
              </div>
              <BudgetContactSelector
                value={chosenContactId || undefined}
                onValueChange={(v) => setChosenContactId(v)}
                prefill={contactPrefill}
                autoStartCreateWithPrefill={!issuerContact?.id && !!contactPrefill}
              />
              <p className="text-[11px] text-muted-foreground">
                Puedes elegir un contacto existente o crear uno nuevo. Los datos de la
                factura (NIF, IBAN, email…) se precargan en el formulario.
              </p>
            </div>

            {/* Category picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría del presupuesto</Label>
            <RadioGroup
              value={chosenCategoryId || ''}
              onValueChange={(v) => setChosenCategoryId(v)}
              className="space-y-1.5"
            >
              {categories.map((c) => {
                const isHidden = hiddenCategoryIds?.has(c.id);
                const isSelected = chosenCategoryId === c.id;
                return (
                  <label
                    key={c.id}
                    htmlFor={`pick-cat-${c.id}`}
                    className={`flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RadioGroupItem value={c.id} id={`pick-cat-${c.id}`} />
                      <span className="text-sm font-medium truncate">
                        {c.name}
                      </span>
                    </div>
                    {isHidden ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                      >
                        <EyeOff className="h-3 w-3" />
                        Oculta
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                      >
                        <Eye className="h-3 w-3" />
                        Visible
                      </Badge>
                    )}
                  </label>
                );
              })}
            </RadioGroup>
            </div>
          </div>

          <AlertDialogFooter className="px-6 pb-6 pt-3 border-t bg-background">
            <Button
              variant="outline"
              onClick={() => setPickCategoryOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const cat = categories.find((c) => c.id === chosenCategoryId);
                if (!cat) return;
                setPickCategoryOpen(false);
                await performCreateLines(cat);
              }}
              disabled={!chosenCategoryId || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Sparkles className="h-4 w-4 mr-2" />
              Crear líneas aquí
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
