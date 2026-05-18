import { useMemo, useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Check, Plus, User, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ExtractedInvoice } from '@/lib/invoiceMatching';

interface IssuerContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  legal_name: string | null;
}

interface Props {
  loading: boolean;
  error: string | null;
  extraction: ExtractedInvoice | null;
  // Contacto vinculado a la línea principal (el proveedor probable). Para sugerir enriquecimiento.
  issuerContact?: IssuerContact | null;
  onRetry: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  iban: 'IBAN',
  legal_name: 'Nombre fiscal',
};

const fmt = (n: number | undefined | null) =>
  n == null ? '—' : `${n.toFixed(2)} €`;

export function InvoiceExtractionPanel({ loading, error, extraction, issuerContact, onRetry }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  const enrichmentChips = useMemo(() => {
    if (!extraction?.issuer || !issuerContact) return [];
    const issuer = extraction.issuer;
    const map: { field: keyof IssuerContact; value?: string }[] = [
      { field: 'email', value: issuer.email },
      { field: 'phone', value: issuer.phone },
      { field: 'address', value: issuer.address },
      { field: 'iban', value: issuer.iban },
      { field: 'legal_name', value: issuer.legal_name },
    ];
    return map
      .filter((m) => !!m.value)
      .map((m) => {
        const current = (issuerContact[m.field] as string | null) || null;
        let kind: 'add' | 'differs' | 'same' = 'add';
        if (current && current.trim().toLowerCase() === (m.value as string).trim().toLowerCase()) kind = 'same';
        else if (current) kind = 'differs';
        return { field: m.field as string, value: m.value as string, current, kind };
      });
  }, [extraction, issuerContact]);

  const handleAdd = async (field: string, value: string) => {
    if (!issuerContact) return;
    const { error: e } = await supabase
      .from('contacts')
      .update({ [field]: value })
      .eq('id', issuerContact.id);
    if (e) {
      toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' });
      return;
    }
    setSavedFields((p) => new Set(p).add(field));
    toast({ title: 'Contacto actualizado', description: `${FIELD_LABELS[field] || field} añadido a ${issuerContact.name || 'contacto'}.` });
  };

  if (loading) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <div className="text-sm">
          <span className="font-medium">Leyendo factura con IA…</span>
          <p className="text-xs text-muted-foreground">Extrayendo emisor, conceptos e importes para sugerirte la vinculación.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3 flex items-start gap-3 text-xs">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">No se pudo analizar la factura.</p>
          <p className="text-amber-700 dark:text-amber-300">{error} Puedes vincularla manualmente abajo.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onRetry}>Reintentar</Button>
      </div>
    );
  }

  if (!extraction) return null;

  const inv = extraction.invoice || {};
  const issuer = extraction.issuer || {};
  const recipient = extraction.recipient || {};
  const lineCount = extraction.lines?.length || 0;

  return (
    <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/5 transition-colors"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold flex-1 text-left">
          Datos extraídos por IA
          {issuer.name && <span className="text-muted-foreground font-normal"> · {issuer.name}</span>}
          {inv.total != null && <span className="text-muted-foreground font-normal"> · {fmt(inv.total)}</span>}
        </span>
        <Badge variant="secondary" className="text-[10px]">{lineCount} concepto{lineCount === 1 ? '' : 's'}</Badge>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-3 border-t border-primary/10 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Emisor
              </div>
              <div className="text-muted-foreground space-y-0.5">
                <div className="text-foreground font-medium">{issuer.name || '—'}</div>
                {issuer.tax_id && <div>NIF/CIF: {issuer.tax_id}</div>}
                {issuer.email && <div>{issuer.email}</div>}
                {issuer.phone && <div>{issuer.phone}</div>}
                {issuer.iban && <div className="font-mono text-[11px]">{issuer.iban}</div>}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Receptor
              </div>
              <div className="text-muted-foreground space-y-0.5">
                <div className="text-foreground font-medium">{recipient.name || '—'}</div>
                {recipient.tax_id && <div>NIF/CIF: {recipient.tax_id}</div>}
                {recipient.address && <div className="line-clamp-2">{recipient.address}</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
            {inv.number && <div><div className="text-muted-foreground">Nº</div><div className="font-medium">{inv.number}</div></div>}
            {inv.date && <div><div className="text-muted-foreground">Fecha</div><div className="font-medium">{inv.date}</div></div>}
            {inv.subtotal != null && <div><div className="text-muted-foreground">Base</div><div className="font-mono">{fmt(inv.subtotal)}</div></div>}
            {inv.iva_amount != null && <div><div className="text-muted-foreground">IVA{inv.iva_pct != null ? ` (${inv.iva_pct}%)` : ''}</div><div className="font-mono">{fmt(inv.iva_amount)}</div></div>}
            {inv.irpf_amount != null && <div><div className="text-muted-foreground">IRPF{inv.irpf_pct != null ? ` (${inv.irpf_pct}%)` : ''}</div><div className="font-mono">−{fmt(inv.irpf_amount)}</div></div>}
            {inv.total != null && <div><div className="text-muted-foreground">Total</div><div className="font-semibold font-mono">{fmt(inv.total)}</div></div>}
          </div>

          {extraction.lines?.length > 0 && (
            <div className="rounded-md border bg-background/50">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 pt-2">Conceptos detectados</div>
              <div className="p-2 space-y-1">
                {extraction.lines.map((l, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">{l.description}</span>
                    <span className="font-mono shrink-0">{fmt(l.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {issuerContact && enrichmentChips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Completar contacto «{issuerContact.name}»
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enrichmentChips.map((c) => {
                  const saved = savedFields.has(c.field);
                  if (c.kind === 'same' || saved) {
                    return (
                      <Badge key={c.field} variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 gap-1">
                        <Check className="h-3 w-3" /> {FIELD_LABELS[c.field] || c.field}
                      </Badge>
                    );
                  }
                  if (c.kind === 'add') {
                    return (
                      <button
                        key={c.field}
                        type="button"
                        onClick={() => handleAdd(c.field, c.value)}
                        className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                        title={c.value}
                      >
                        <Plus className="h-3 w-3" /> Añadir {FIELD_LABELS[c.field] || c.field}
                      </button>
                    );
                  }
                  // differs
                  return (
                    <button
                      key={c.field}
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Reemplazar ${FIELD_LABELS[c.field] || c.field}?\n\nActual: ${c.current}\nNuevo: ${c.value}`)) {
                          void handleAdd(c.field, c.value);
                        }
                      }}
                      className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                      title={`Actual: ${c.current}\nNuevo: ${c.value}`}
                    >
                      <AlertTriangle className="h-3 w-3" /> Sugerir cambio · {FIELD_LABELS[c.field] || c.field}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
