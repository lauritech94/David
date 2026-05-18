// Catálogo único de estados de facturación de partidas de presupuesto.
// Cualquier nuevo estado debe añadirse aquí y reflejarse en helpers.

export type BillingStatusValue =
  | 'pendiente'
  | 'factura_solicitada'
  | 'factura_recibida'
  | 'pagada'
  | 'pagado'
  | 'pagado_sin_factura'
  | 'agrupada'
  | 'facturado'
  | 'cancelado';

export const BILLING_STATUS_OPTIONS: { value: BillingStatusValue; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'factura_solicitada', label: 'Factura solicitada' },
  { value: 'factura_recibida', label: 'Factura recibida' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'pagado_sin_factura', label: 'Pagado (sin justificante)' },
  { value: 'agrupada', label: 'Agrupada en factura' },
];

const PAID_STATUSES: BillingStatusValue[] = ['pagado', 'pagada', 'pagado_sin_factura'];

export const isPaidStatus = (s?: string | null): boolean =>
  !!s && (PAID_STATUSES as string[]).includes(s);

export const needsRegularization = (s?: string | null): boolean =>
  s === 'pagado_sin_factura';

export const billingStatusLabel = (s?: string | null): string => {
  switch (s) {
    case 'pendiente': return 'Pendiente';
    case 'factura_solicitada': return 'Factura solicitada';
    case 'factura_recibida':
    case 'facturado': return 'Factura recibida';
    case 'pagada':
    case 'pagado': return 'Pagada';
    case 'pagado_sin_factura': return 'Pagado (sin justificante)';
    case 'agrupada': return 'Agrupada en factura';
    case 'cancelado': return 'Cancelado';
    default: return s || 'Pendiente';
  }
};

// Lista útil para consultas Supabase: todos los estados que se consideran "pagado"
export const PAID_STATUSES_FOR_QUERY = '(pagado,pagada,pagado_sin_factura)';
